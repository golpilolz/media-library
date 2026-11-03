# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

`golpilolz/media-library` is a Symfony 7.4/8 bundle: a form type renders a button that opens a popup (Stimulus controller) to browse Doctrine-backed folders and pick a file. It is developed **in place** as a git clone inside the harness app at `../../../` (`symfony-bundle-dev/website`, see the parent repo's `CLAUDE.md` for the Docker stack). Commit here, in the bundle repo, not in the app repo.

The app exercises the bundle with `App\Entity\File` / `App\Entity\Folder` (extending `Golpilolz\MediaLibrary\Model\*`), `App\Form\ProductType`, and `config/packages/golpilolz_media_library.yaml`. The `/` route renders the form and needs the DB (Docker stack). After changing services/config here, run `bin/console cache:clear` in the app: Symfony does not watch `vendor/` for container freshness.

User-facing docs live in `docs/index.md`. A Flex recipe draft lives in `recipe/` (not loaded by anything, it's meant to be submitted to `symfony/recipes-contrib`). Keep both in sync with config/service changes.

There are no PHP tests (`autoload-dev` points at a nonexistent `tests/`), no linters, no static analysis.

## Front-end build

`assets/` is an npm package (`@golpilolz/medialibrary`). The TypeScript Stimulus controller `assets/src/controller.ts` is compiled with Babel (no bundler, no type-checking) and **`assets/dist/` is committed**: it is what AssetMapper serves, so rebuild and commit `dist/` after editing `src/`.

```bash
cd assets
npm install
npm run build       # babel src/*.ts -> dist/controller.js
npm run build:css   # cat src/*.css | csso -> dist/style.min.css
```

Babel targets ES-module browsers (`targets.esmodules`), so async/await stays native: no regenerator runtime. `tsc` isn't part of the build, but you can type-check with `node_modules/.bin/tsc --noEmit --target es2020 --module es2020 --moduleResolution node --lib es2020,dom,dom.iterable --skipLibCheck src/controller.ts`. The only expected error is the missing `dropzone` types. The Node 16 nvm default runs the build, but `npx` is broken with the global npm. The file-type icons live directly in `dist/icons/` (like `dist/fonts/`) and are referenced from CSS, so AssetMapper rewrites them with digests.

The popup has no jQuery and no CSS framework. Markup comes from TypeScript template literals (always pass names through `escapeHtml`), dialogs use native `<dialog>`, and the context menu is hand-made. The UI strings are French (`LANG` in the controller). Dropzone 6 is the only runtime dependency. It's imported dynamically, only when the `upload_url` form option is set, and must be in the app's importmap.

Front-end pitfalls already hit:
- The widget renders inside the page's Symfony `<form>`. The HTML parser drops a nested `<form>` (so no `<form method="dialog">`), and any `type="submit"` button or Enter in an input submits the page.
- `open()` is async (it fetches folders). A `session` counter discards a stale `open()` after a newer open or a close, which would otherwise attach a second Dropzone.
- Don't animate `transform` on the popup: it turns the popup into the containing block of the `position: fixed` context menu and offsets it.

## Architecture

- `src/GolpilolzMediaLibrary.php` is an `AbstractBundle` that delegates to the classic `DependencyInjection/GolpilolzMediaLibraryExtension` (not `AbstractBundle::configure()`/`loadExtension()`).
- **Extension `prepend()`** registers the Twig form theme `templates/Form/golpilolz_media_library_single_widget.html.twig` and maps `assets/dist` into AssetMapper as `@golpilolz/media-library`. That mapping, plus the `symfony.controllers` block in `assets/package.json`, produces the Stimulus identifier `golpilolz--media-library--media-library` used in the widget template's `data-controller` / `data-…-target` attributes. Renaming any of these breaks the wiring silently.
- **Extension `load()`** loads `config/services.yaml` (autowires all of `src/` except DI and the bundle class), exposes every top-level config key as a `golpilolz_medialibrary.<key>` parameter, and registers `Form\Type\GolpilolzMediaLibrarySingleType` (extends `EntityType`). `loadFiles()`/`loadFolders()` are dead code: they load `file.yml`/`folder.yaml`, which don't exist, and their calls are commented out. The `file_manager`/`folder_manager` defaults (`ip_bibliotheque.*`) are leftovers from the IpBibliotheque bundle this was ported from, as is `templates/media-libray.html.twig`.
- **Data flow:** the widget template sets the Stimulus value `folders-url` to `path('golpilolz_media-library_folders')`. The controller fetches it, and `Controller/MediaLibraryController` (routes loaded by the app from `config/routes.yaml`) returns a flat JSON list of folders `{id, type, name, parent, active, open, files[{id, name, url}]}`. The JS rebuilds the tree from `parent` ids. Root is `parent === 0`/`null`. Rename, move, delete and add-folder have no backend: the controller dispatches `golpilolz_media-library:*` events, and a listener persists the change via `event.detail.respondWith(promise)` (see `docs/index.md`).
- **Models:** `src/Model` holds abstract `File`/`Folder`/`OrderedFile` plus interfaces and abstract managers. The app supplies ORM mapping (ids, relations) on concrete subclasses. Only a Doctrine `FolderManager` exists (no Doctrine `FileManager`). Its `$class` argument is **hardcoded to `App\Entity\Folder`** in `config/services.yaml` instead of using the `folder.folder_class` config. `FolderManagerInterface` is autowired to it through the `src/` resource scan.
