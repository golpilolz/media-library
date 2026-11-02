# Symfony Flex recipe

Draft recipe for `golpilolz/media-library`, laid out as in
[symfony/recipes-contrib](https://github.com/symfony/recipes-contrib):
`golpilolz/media-library/1.0/{manifest.json,config/,post-install.txt}`.

## Publish it

1. Fork `symfony/recipes-contrib`.
2. Copy `recipe/1.0/` to `golpilolz/media-library/1.0/` in the fork.
3. Open a PR (Flex's CI validates the manifest). The bundle must be on Packagist.

## Use it before it is accepted

Host the recipe in your own endpoint, or in the app's `composer.json`:

```json
"extra": {
    "symfony": {
        "endpoint": [
            "https://api.github.com/repos/<you>/recipes/contents/index.json?ref=flex/main",
            "flex://defaults"
        ]
    }
}
```

or just copy `recipe/1.0/config/*` into the app by hand.

## What it does

- registers `GolpilolzMediaLibrary` in `config/bundles.php`;
- creates `config/packages/golpilolz_media_library.yaml`
  (must be `.yaml`: the kernel does not load `.yml`);
- creates `config/routes/golpilolz_media_library.yaml`;
- prints the post-install checklist.
