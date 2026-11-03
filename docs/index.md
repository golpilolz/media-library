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

Each key is exposed as a `golpilolz_medialibrary.<key>` container parameter.

## Usage in a form

```php
use Golpilolz\MediaLibrary\Form\Type\GolpilolzMediaLibrarySingleType;

$builder->add('file', GolpilolzMediaLibrarySingleType::class, [
    // extends EntityType; 'class' defaults to Golpilolz\MediaLibrary\Entity\File, 'choice_label' to 'name'
    'multiple' => false,
    'upload_url' => null,         // drag & drop upload URL; defaults to the bundle's endpoint, null disables upload
    'theme' => 'easyadmin',       // defaults to the `theme` config key
]);
```

The widget renders a button opening the popup; folders and files are loaded from the
JSON route `golpilolz_media-library_folders` (`GET /media-library/folders`). Double-click a
file (or, with `multiple`, select files and press ✓) to write its id to the hidden input.

With `multiple`, the widget shows the selected files as tiles: × removes one, "Ajouter" reopens
the popup with the current selection preselected, "Tout retirer" clears the field. An empty
multiple field submits nothing (its hidden input is disabled), so the collection is emptied.

Right-click in the file grid for: rename / move / delete a file, rename a folder, create a
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
`allowed_extensions`, and creates the `File` entity. It has no access control: protect
`^/media-library` in `security.yaml` like the rest of your back office. A custom endpoint
must respond with:

```json
{"result": "success", "file": {"id": 12, "name": "photo.jpg", "url": "https://…/photo.jpg", "parent": 3}}
```

Any other `result` is shown as an upload error.

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
| `add-folder` | `parent` (folder or `null` for root), `name` |
| `upload-sending` | `file`, `folder`, `xhr`, `formData` |
| `connect`, `showPopup`, `closePopup`, `clear` | – |

The bundle has no endpoints for rename / move / delete / add folder yet: those changes are only
applied in the popup unless a listener persists them. A listener can make the popup wait by
passing a promise to `event.detail.respondWith()`; if it rejects, the error is shown in the
dialog and nothing changes. For `add-folder`, resolve with `{id}` (otherwise the folder gets a
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
