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

The bundle only ships abstract models. Create concrete entities:

```php
use Golpilolz\MediaLibrary\Model\File as BaseFile;

#[ORM\Entity]
class File extends BaseFile
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    protected int $id;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: 'files')]
    #[ORM\JoinColumn(name: 'folder_id', nullable: true)]
    protected FolderInterface $folder;
}
```

```php
use Golpilolz\MediaLibrary\Model\Folder as BaseFolder;

#[ORM\Entity]
class Folder extends BaseFolder
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    protected int $id;

    #[ORM\OneToMany(mappedBy: 'folder', targetEntity: File::class)]
    protected Collection $files;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: 'children')]
    #[ORM\JoinColumn(name: 'parent_id', nullable: true)]
    protected ?FolderInterface $parent;

    #[ORM\OneToMany(mappedBy: 'parent', targetEntity: Folder::class)]
    protected Collection $children;
}
```

Then run `make:migration` and `doctrine:migrations:migrate`.

## Configuration

`config/packages/golpilolz_media_library.yaml` (extension alias `golpilolz_media_library`):

| Key | Default | Description |
|---|---|---|
| `file.file_class` | required | Your concrete `File` entity |
| `folder.folder_class` | required | Your concrete `Folder` entity |
| `assets_path` | `/assets/golpilolzmedialibrary` | Public path of library assets |
| `root_folder` | – | Root folder label |
| `include_assets`, `include_bootstrap`, `include_jQuery` | – | Toggle bundled front-end assets |
| `model_manager_name` | `null` | Doctrine entity manager name |

Each key is exposed as a `golpilolz_medialibrary.<key>` container parameter.

> Known limitation: `config/services.yaml` hardcodes `App\Entity\Folder` for
> `Golpilolz\MediaLibrary\Doctrine\FolderManager`; override that service in your app
> if your entity lives elsewhere.

## Usage in a form

```php
use Golpilolz\MediaLibrary\Form\Type\GolpilolzMediaLibrarySingleType;

$builder->add('file', GolpilolzMediaLibrarySingleType::class, [
    'class' => File::class,       // it extends EntityType
    'choice_label' => 'name',
    'multiple' => false,
]);
```

The widget renders a button opening the popup; folders and files are loaded from the
JSON route `golpilolz_media-library_folders` (`GET /media-library/folders`).

## Extending

- Implement `FileInterface` / `FolderInterface` / `FolderManagerInterface` to replace the models and manager.
- Stimulus controller: `golpilolz--media-library--media-library` (source in `assets/src/controller.ts`, built to `assets/dist`).
