<?php

namespace Golpilolz\MediaLibrary\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('golpilolz_media_library');
        $treeBuilder->getRootNode()
            ->children()
                ->scalarNode('assets_path')->defaultValue('/assets/golpilolzmedialibrary')->end()
                ->scalarNode('root_folder')->end()
                ->booleanNode('include_assets')->end()
                ->booleanNode('include_jQuery')->end()
                ->booleanNode('include_bootstrap')->end()
                ->scalarNode('theme')
                    ->info('Default widget theme: "default", "sonata", "easyadmin", "sylius" or a custom theme name. Overridable per field with the "theme" form option.')
                    ->defaultValue('default')
                    ->validate()
                        ->ifTrue(static fn ($theme) => !\is_string($theme) || !preg_match('/^[a-z0-9_]+$/', $theme))
                        ->thenInvalid('The theme name %s must only contain lowercase letters, digits and underscores.')
                    ->end()
                ->end()
                ->scalarNode('upload_dir')
                    ->info('Directory where uploaded files are stored.')
                    ->defaultValue('%kernel.project_dir%/public/uploads/media-library')
                ->end()
                ->scalarNode('upload_path')
                    ->info('Public path of upload_dir, relative to the web root (stored in File::$url).')
                    ->defaultValue('uploads/media-library')
                ->end()
                ->arrayNode('allowed_extensions')
                    ->info('File extensions accepted by the upload endpoint.')
                    ->scalarPrototype()->end()
                    ->defaultValue(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'pdf', 'txt', 'csv', 'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp', 'zip', 'mp3', 'mp4', 'webm'])
                ->end()
                ->arrayNode('security')
                    ->info('Protection of the bundle\'s /media-library endpoints.')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('view_role')
                            ->info('Role (or any is_granted() attribute) required by the read endpoints (folders, file info). Null makes them public.')
                            ->defaultValue('ROLE_ADMIN')
                        ->end()
                        ->scalarNode('edit_role')
                            ->info('Role (or any is_granted() attribute) required by the write endpoints (upload, add/rename folder, rename/move/delete file). Null makes them public.')
                            ->defaultValue('ROLE_ADMIN')
                        ->end()
                        ->booleanNode('csrf_protection')
                            ->info('Require a valid CSRF token (header X-CSRF-Token, token id "golpilolz_media_library") on the write endpoints.')
                            ->defaultTrue()
                        ->end()
                    ->end()
                ->end()
            ->end()
        ;

        return $treeBuilder;
    }
}
