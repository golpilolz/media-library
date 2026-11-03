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
            ->end()
        ;

        return $treeBuilder;
    }
}
