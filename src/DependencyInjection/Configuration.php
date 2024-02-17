<?php
// https://github.com/excelwebzone/EWZRecaptchaBundle/blob/master/src/DependencyInjection/EWZRecaptchaExtension.php
namespace Golpilolz\MediaLibrary\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\ArrayNodeDefinition;
use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    protected string $extensionAlias = 'golpilolz_media_library';

    /**
     * {@inheritdoc}
     */
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('golpilolz_media_library');
        $rootNode = $treeBuilder->getRootNode();
        $rootNode
            ->children()
                ->scalarNode('assets_path')->defaultValue('/assets/golpilolzmedialibrary')->end()
                ->scalarNode('root_folder')->end()
                ->booleanNode('include_assets')->end()
                ->booleanNode('include_jQuery')->end()
                ->booleanNode('include_bootstrap')->end()
                ->scalarNode('model_manager_name')->defaultNull()->end()
            ->end()
        ;
        $this->addFileSection($rootNode);
        $this->addFolderSection($rootNode);

        return $treeBuilder;
    }

    public function addFileSection(ArrayNodeDefinition $node): void
    {
        $node
            ->children()
                ->arrayNode('file')
                    ->canBeUnset()
                    ->children()
                        ->scalarNode('file_manager')->defaultValue('ip_bibliotheque.file_manager.default')->end()
                        ->scalarNode('file_class')->isRequired()->cannotBeEmpty()->end()
                    ->end()
                ->end()
            ->end()
        ;
    }

    public function addFolderSection(ArrayNodeDefinition $node): void
    {
        $node
            ->children()
                ->arrayNode('folder')
                    ->canBeUnset()
                    ->children()
                        ->scalarNode('folder_manager')->defaultValue('ip_bibliotheque.folder_manager.default')->end()
                        ->scalarNode('folder_class')->isRequired()->cannotBeEmpty()->end()
                    ->end()
                ->end()
            ->end()
        ;
    }
}
