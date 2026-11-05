# media-library documentation

## Installation

```bash
composer require golpilolz/media-library
```

Without the Flex recipe (see `recipe/`), do it manually:

```php
// config/bundles.php
Golpilolz\MediaLibrary\GolpilolzMediaLibrary::class => ['all' => true],
```

```yaml
# config/routes/golpilolz_media_library.yaml
golpilolz_media_library:
    resource: '@GolpilolzMediaLibrary/config/routes.yaml'
```

The bundle prepends the Twig form theme and an AssetMapper path
(`@golpilolz/media-library`, the Stimulus controller) automatically.

## Entities

The bundle ships the Doctrine entities `Golpilolz\MediaLibrary\Entity\File` and
`Golpilolz\MediaLibrary\Entity\Folder` (tables `file` / `folder`, with repositories in
`Golpilolz\MediaLibrary\Repository`). They are picked up by DoctrineBundle's `auto_mapping`.
Generate the tables with `make:migration` and `doctrine:migrations:migrate`.


## Configuration

`config/packages/golpilolz_media_library.yaml` (extension alias `golpilolz_media_library`), all optional:

| Key | Default | Description |
|---|---|---|
| `assets_path` | `/assets/golpilolzmedialibrary` | Public path of library assets |
| `root_folder` | – | Root folder label |
| `include_assets`, `include_bootstrap`, `include_jQuery` | – | Toggle bundled front-end assets |
| `theme` | `default` | Default widget theme (see [Themes](#themes)) |
| `upload_dir` | `%kernel.project_dir%/public/uploads/media-library` | Where uploaded files are stored |
| `upload_path` | `uploads/media-library` | Public path of `upload_dir`, relative to the web root |
| `allowed_extensions` | images (no SVG), pdf, office, txt/csv, zip, mp3/mp4/webm | Extensions the upload endpoint accepts |
| `security.view_role` | `ROLE_ADMIN` | Attribute required by the read endpoints, `null` = public (see [Security](#security)) |
| `security.edit_role` | `ROLE_ADMIN` | Attribute required by the write endpoints, `null` = public |
| `security.csrf_protection` | `true` | Require a CSRF token on the write endpoints |

Each key is exposed as a `golpilolz_medialibrary.<key>` container parameter (and
`golpilolz_medialibrary.security.<key>` for the `security` keys).

## Security

The bundle's endpoints (`/media-library/*`) are guarded by `Security\EndpointAccessSubscriber`,
which runs before each action of `MediaLibraryController`, whatever prefix the routes are
imported under:

- the read endpoints (`GET /media-library/folders`, `GET /media-library/files/info`) need
  `security.view_role`; the write endpoints (upload, add/rename folder, rename/move/delete file)
  need `security.edit_role`. Both default to `ROLE_ADMIN` and accept anything `is_granted()`
  does (a role, `IS_AUTHENTICATED`, a voter attribute). `null` skips the check;
- with `security.csrf_protection` (default), the write endpoints need the header
  `X-CSRF-Token` holding a token for the id `golpilolz_media_library`. The form widget renders it
  (Stimulus value `csrf-token`) and the popup sends it on every write, Dropzone uploads
  included.

The bundle requires `symfony/security-bundle` and `symfony/security-csrf`. The endpoints must sit
behind a firewall (the default `main` one with a `^/` pattern does): a denied anonymous user gets
the firewall's entry point (401 or a login redirect), a logged-in user without the role a 403.
An invalid or missing CSRF token gets a 403. The token is stored in the session, unless you list
`golpilolz_media_library` in `framework.csrf_protection.stateless_token_ids`, in which case
Symfony checks the request's `Origin` instead.

```yaml
# config/packages/golpilolz_media_library.yaml
golpilolz_media_library:
    security:
        view_role: ROLE_EDITOR      # who can browse the library
        edit_role: ROLE_ADMIN       # who can upload, rename, move and delete
        # csrf_protection: false    # e.g. when every write goes through your own listeners
```

Event listeners that persist changes through your own endpoints (see [Events](#events)) don't
go through this subscriber: protect those endpoints yourself. To send the bundle's token, read
it from the widget's `data-golpilolz--media-library--media-library-csrf-token-value` attribute.

## Usage in a form

```php
use Golpilolz\MediaLibrary\Form\Type\GolpilolzMediaLibrarySingleType;

$builder->add('file', GolpilolzMediaLibrarySingleType::class, [
    // extends EntityType; 'class' defaults to Golpilolz\MediaLibrary\Entity\File, 'choice_label' to 'name'
    'multiple' => false,
    'upload_url' => null,         // drag & drop upload URL; defaults to the bundle's endpoint, null disables upload
    'folder_url' => null,         // folder creation URL; defaults to the bundle's endpoint, null = only event listeners
    'rename_file_url' => null,    // file rename URL; defaults to the bundle's endpoint, null = only event listeners
    'rename_folder_url' => null,  // folder rename URL; same
    'move_file_url' => null,      // file move URL; same
    'delete_file_url' => null,    // file deletion URL; same
    'file_info_url' => null,      // file details URL ("Informations"); defaults to the bundle's endpoint, null = listener or local data only
    'theme' => 'easyadmin',       // defaults to the `theme` config key
]);
```

The widget renders a button opening the popup; folders and files are loaded from the
JSON route `golpilolz_media-library_folders` (`GET /media-library/folders`). Double-click a
file (or, with `multiple`, select files and press ✓) to write its id to the hidden input.

Each file tile shows its size and, for an image, its resolution ("1,5 Mo · 1920 × 1280"). The
route sends them as `size` (bytes), `width` and `height` (pixels) on each file, read from the
stored file when its URL is under `upload_path` (`null` otherwise, and `width`/`height` are
`null` for non-images and SVGs). A file without them just shows its name.

With `multiple`, the widget shows the selected files as tiles: × removes one, "Ajouter" reopens
the popup with the current selection preselected, "Tout retirer" clears the field. An empty
multiple field submits nothing (its hidden input is disabled), so the collection is emptied.

Right-click in the file grid for: show the informations of / rename / crop / move / delete a file, rename a folder, create a
folder. The popup has no jQuery and no CSS framework dependency (native `<dialog>`).

### Upload

Upload uses [Dropzone 6](https://www.npmjs.com/package/dropzone) (no jQuery), loaded lazily
only when `upload_url` is set. Add it to the app importmap:

```bash
php bin/console importmap:require dropzone@6.0.0-beta.2
```

Drop files anywhere in the file grid to upload them to the current folder (or onto a folder
tile to upload them there). Files can't be dropped at the root, which holds no files.

Each dropped file is POSTed to `upload_url` (field `file`, plus `folder`: the target folder
id). The bundle's endpoint `golpilolz_media-library_upload` (`POST /media-library/upload`)
stores it in `upload_dir` (sanitized name, suffixed on collision), rejects extensions outside
`allowed_extensions`, and creates the `File` entity. Like every bundle endpoint, it requires
`security.edit_role` and a CSRF token (see [Security](#security)). A custom endpoint
must respond with:

```json
{"result": "success", "file": {"id": 12, "name": "photo.jpg", "url": "https://…/photo.jpg", "parent": 3}}
```

`size`, `width` and `height` are optional in that `file` (the bundle's endpoint sends them, see above).

Any other `result` is shown as an upload error.

### Crop

"Recadrer" (right-click on a JPEG, PNG or WebP image) opens a crop dialog: free or fixed
proportions (1:1, 4:3, 3:2, 16:9), drag the corners or edges to resize, inside the box to move
it (arrow keys too, Shift for bigger steps), or on the image to draw a new box. The original
file is kept: the browser crops the image with a canvas (same format, JPEG/WebP at quality 0.92)
and saves the result as a **new file** in the same folder, named "<name> (recadré).<ext>", which
gets selected.

The cropped file is POSTed to `upload_url` like a dropped file (so `allowed_extensions` applies),
unless a `crop-file` listener answers: its promise must resolve with the new file
`{id, url, name?}`. With `upload_url` set to `null` and no listener, cropping fails. The image
must be same-origin (or served with CORS headers): a canvas can't export a cross-origin image.

### File informations

"Informations" (right-click on a file) opens a dialog with a preview, the name, the folder path
and the URL, then fills in the details only the server knows: MIME type, size, image dimensions
and modification date. They come from `golpilolz_media-library_file_info`
(`GET /media-library/files/info?file=<id>`, set by the `file_info_url` form option):

```json
{"result": "success", "file": {"id": 12, "name": "photo.jpg", "url": "https://…/photo.jpg",
 "path": ["Photos", "2026"], "extension": "jpg", "size": 81774, "mimeType": "image/jpeg",
 "modifiedAt": "2026-11-04T11:29:53+00:00", "width": 1600, "height": 900}}
```

`path` lists the folder names from the root. `size`, `mimeType`, `modifiedAt`, `width` and
`height` are read from the stored file, so they are `null` when its URL isn't under
`upload_path` or the file is missing; the dialog hides unknown fields. A `file-info` listener
can answer instead, resolving with any of those fields. With `file_info_url` set to `null` and no
listener, the dialog only shows what the popup knows. When the request fails, the dialog keeps
the known fields and shows an error.

### Events

The Stimulus controller dispatches DOM events prefixed with `golpilolz_media-library:`:

| Event | `detail` |
|---|---|
| `select` | `files` |
| `remove` | `id` (multiple: file removed from the widget) |
| `rename-file` | `file`, `name` |
| `rename-folder` | `folder`, `name` |
| `move-file` | `file`, `folder` (target) |
| `delete-file` | `file` |
| `file-info` | `file` (answer with `respondWith()`, see [File informations](#file-informations)) |
| `crop-file` | `file` (original), `folder`, `crop` (`{x, y, width, height}` in image pixels), `blob` (cropped image), `name` |
| `add-folder` | `parent` (folder or `null` for root), `name` |
| `upload-sending` | `file`, `folder`, `xhr`, `formData` |
| `connect`, `showPopup`, `closePopup`, `clear` | – |

Folder creation is persisted by the bundle's endpoint `golpilolz_media-library_add_folder`
(`POST /media-library/folders`, JSON body `{"name": "…", "parent": <id, or 0 for the root>}`,
responds `{"result": "success", "id": 7}`), set by the `folder_url` form option. An `add-folder`
listener that calls `respondWith()` replaces it; with `folder_url` set to `null` and no listener,
the folder only lives in the popup.

The other context-menu actions work the same way. Each endpoint takes a JSON body, responds
`{"result": "success"}`, and is replaced by a listener of the matching event:

| Action | Endpoint (route `golpilolz_media-library_…`) | JSON body | Form option | Event |
|---|---|---|---|---|
| Rename a file | `POST /media-library/files/rename` (`rename_file`) | `{"file": <id>, "name": "…"}` | `rename_file_url` | `rename-file` |
| Rename a folder | `POST /media-library/folders/rename` (`rename_folder`) | `{"folder": <id>, "name": "…"}` | `rename_folder_url` | `rename-folder` |
| Move a file | `POST /media-library/files/move` (`move_file`) | `{"file": <id>, "folder": <target id>}` | `move_file_url` | `move-file` |
| Delete a file | `POST /media-library/files/delete` (`delete_file`) | `{"file": <id>}` | `delete_file_url` | `delete-file` |

Renaming a file changes its display name only: the stored file keeps its name and URL.
Deleting a file removes the `File` entity and, when its URL is under `upload_path`, the stored
file in `upload_dir`. A file still referenced by another entity (a foreign key, e.g. a product's
image) is refused with a 409.

### Endpoint errors

The bundle's endpoints map their input with `#[MapRequestPayload]` / `#[MapUploadedFile]`
(DTOs in `Dto\`: `AddFolderPayload`, `RenameFilePayload`, `RenameFolderPayload`, `MoveFilePayload`, `DeleteFilePayload`, `UploadPayload`; the `files/info` query parameter with `#[MapQueryParameter]`), so a malformed request is rejected by
Symfony before the controller runs:

| Endpoint | Request | Status |
|---|---|---|
| all | anonymous user when the role isn't `null` | 401 (or the firewall's login redirect) |
| all | user without `security.view_role` (`GET`) or `security.edit_role` (`POST`) | 403 |
| all `POST` | missing or invalid `X-CSRF-Token` header (with `security.csrf_protection`) | 403 |
| all | body that can't be parsed, or upload without a `folder` field | 400 |
| all `POST` but `upload` | `Content-Type` other than JSON | 415 |
| `POST /media-library/folders` | blank `name` (after trimming), `name` over 255 characters, non-integer `parent` | 422 |
| `POST /media-library/files/rename`, `/folders/rename` | `file`/`folder` missing or not a positive integer, blank `name` (after trimming), `name` over 255 characters | 422 |
| `POST /media-library/files/move` | missing `file` or `folder`, or not a positive integer | 422 |
| `POST /media-library/files/delete` | missing `file`, or not a positive integer | 422 |
| `GET /media-library/files/info` | missing `file` query parameter, or not a positive integer | 404 |
| `POST /media-library/upload` | missing or failed `file` (also for a non-multipart body), `folder` not a positive integer | 422 |

Those errors use Symfony's error format. With `Accept: application/json` it's a problem
details object, listing the failed fields under `violations` in a 422:

```json
{"type": "https://symfony.com/errors/validation", "title": "Validation Failed", "status": 422,
 "detail": "name: This value should not be blank.", "violations": [{"propertyPath": "name", "title": "This value should not be blank.", …}]}
```

The checks the controller does itself respond with `{"result": "error", "message": "…"}`:
an unknown file or folder (400), a deleted file still in use (409), an extension outside
`allowed_extensions` (415), and a file that can't be moved to `upload_dir` (500).

The popup only tells success from failure: on any error it shows its own message
("Erreur lors de la création du dossier", "Erreur lors de l'envoi du fichier", "Erreur lors du
renommage du fichier"…) and logs the details to the console.

A listener persists a change itself by passing a promise to `event.detail.respondWith()`:
the bundle's endpoint is then not called, and the popup waits for the promise. If it rejects,
its error message is shown in the dialog and nothing changes. With the action's URL option set
to `null` and no listener, the change only lives in the popup. For `add-folder`, resolve with `{id}` (otherwise the folder gets a
temporary negative id).

```js
document.addEventListener('golpilolz_media-library:rename-file', (event) => {
    const {file, name} = event.detail;
    event.detail.respondWith(fetch(`/my/files/${file.id}`, {
        method: 'PATCH',
        body: JSON.stringify({name}),
    }).then((r) => { if (!r.ok) throw new Error('Renommage impossible'); }));
});
```

## Themes

A theme restyles the widget and its popup to match the host page. Pick it globally with the
`theme` config key, or per field with the `theme` form option (useful when the same app has a
front-end and a back office):

```yaml
# config/packages/golpilolz_media_library.yaml
golpilolz_media_library:
    theme: easyadmin
```

| Theme | For | Notes |
|---|---|---|
| `default` | any page | Neutral look, light and dark following the OS scheme |
| `sonata` | Sonata Admin 4 (AdminLTE / Bootstrap 3) | AdminLTE colors, font and radii; always light, like AdminLTE |
| `easyadmin` | EasyAdmin 4 | Reads EasyAdmin's CSS variables, so it follows its colors and its light/dark switch |
| `sylius` | Sylius 2 admin (Tabler / Bootstrap 5) | Reads Tabler's CSS variables (Sylius green, Inter, radii), so it follows `data-bs-theme` light/dark |

The built-in themes are included in `style.min.css`: nothing else to load. They also raise the
popup above the admin header and modals.

The widget still needs the Stimulus controller and its stylesheet, i.e. the app's importmap
entrypoint (StimulusBundle loads the controller and its CSS from `assets/controllers.json`).
Admin layouts don't load it by default:

### EasyAdmin

```php
// src/Controller/Admin/DashboardController.php
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;

public function configureAssets(): Assets
{
    return Assets::new()->addAssetMapperEntry('app');
}
```

```php
// In a CRUD controller
yield AssociationField::new('file')->setFormType(GolpilolzMediaLibrarySingleType::class);
// or
yield Field::new('file')->setFormType(GolpilolzMediaLibrarySingleType::class)
    ->setFormTypeOption('theme', 'easyadmin');
```

### Sonata Admin

Override the Sonata layout to load the importmap:

```yaml
# config/packages/sonata_admin.yaml
sonata_admin:
    templates:
        layout: 'admin/layout.html.twig'
```

```twig
{# templates/admin/layout.html.twig #}
{% extends '@SonataAdmin/standard_layout.html.twig' %}

{% block javascripts %}
    {{ parent() }}
    {{ importmap('app') }}
{% endblock %}
```

```php
// In an admin's configureFormFields()
$form->add('file', GolpilolzMediaLibrarySingleType::class, ['theme' => 'sonata']);
```

### Sylius

The Sylius 2 admin loads its own Webpack Encore entry, not the app's importmap. With AssetMapper,
add the importmap to every admin page through a Twig hook:

```yaml
# config/packages/sylius_twig_hooks.yaml
sylius_twig_hooks:
    hooks:
        'sylius_admin.base#javascripts':
            media_library:
                template: 'admin/media_library_importmap.html.twig'
```

```twig
{# templates/admin/media_library_importmap.html.twig #}
{{ importmap('app') }}
```

```php
// In a Sylius resource form type, or a form type extension of one
$builder->add('file', GolpilolzMediaLibrarySingleType::class, ['theme' => 'sylius']);
```

### Custom theme

A theme name (lowercase letters, digits, `_`) adds the class `ml-theme-<name>` to the widget
root. Restyle it by overriding the `--ml-*` design tokens (see the top of
`assets/src/style.css` for the full list) on both the widget and the popup panel:

```css
.golpilolz-media-library-widget.ml-theme-acme,
.ml-theme-acme .golpilolz-media-library {
    --ml-accent: #e4007c;
    --ml-font: "Inter", sans-serif;
    --ml-radius-field: 4px;   /* widget card */
    --ml-radius: 10px;        /* popup */
    --ml-z: 1100;             /* popup z-index */
}
```

Set every color token if the theme must ignore the OS dark scheme.

To change the widget markup for one theme, define the Twig block
`golpilolz_media_library_single_theme_<name>_widget` in a form theme. Twig picks it before the
default `golpilolz_media_library_single_widget` block, and can still render the default one:

```twig
{# templates/form/media_library_acme.html.twig, added to twig.form_themes #}
{% use '@GolpilolzMediaLibrary/Form/golpilolz_media_library_single_widget.html.twig' %}

{% block golpilolz_media_library_single_theme_acme_widget %}
    <p class="help">Images de 2 Mo maximum.</p>
    {{- block('golpilolz_media_library_single_widget') -}}
{% endblock %}
```

The `theme` name is available in the widget as the `theme` variable.

## Extending

- Stimulus controller: `golpilolz--media-library--media-library` (source in `assets/src/controller.ts`, built to `assets/dist`).
