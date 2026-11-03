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

Each key is exposed as a `golpilolz_medialibrary.<key>` container parameter.

## Usage in a form

```php
use Golpilolz\MediaLibrary\Form\Type\GolpilolzMediaLibrarySingleType;

$builder->add('file', GolpilolzMediaLibrarySingleType::class, [
    // extends EntityType; 'class' defaults to Golpilolz\MediaLibrary\Entity\File, 'choice_label' to 'name'
    'multiple' => false,
    'upload_url' => null,         // URL receiving drag & drop uploads; null disables upload
]);
```

The widget renders a button opening the popup; folders and files are loaded from the
JSON route `golpilolz_media-library_folders` (`GET /media-library/folders`). Double-click a
file (or, with `multiple`, select files and press ✓) to write its id to the hidden input.

Right-click in the file grid for: rename / move / delete a file, rename a folder, create a
folder. The popup has no jQuery and no CSS framework dependency (native `<dialog>`).

### Upload

Upload uses [Dropzone 6](https://www.npmjs.com/package/dropzone) (no jQuery), loaded lazily
only when `upload_url` is set. Add it to the app importmap:

```bash
php bin/console importmap:require dropzone@6.0.0-beta.2
```

Each dropped file is POSTed to `upload_url` (field `file`, plus `folder`: the target folder
id, i.e. the folder it was dropped on or the current one). Respond with:

```json
{"result": "success", "file": {"id": 12, "name": "photo.jpg", "url": "https://…/photo.jpg", "parent": 3}}
```

Any other `result` is shown as an upload error.

### Events

The Stimulus controller dispatches DOM events prefixed with `golpilolz_media-library:`:

| Event | `detail` |
|---|---|
| `select` | `files` |
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

## Extending

- Stimulus controller: `golpilolz--media-library--media-library` (source in `assets/src/controller.ts`, built to `assets/dist`).
