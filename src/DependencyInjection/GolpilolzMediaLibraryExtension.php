<?php

namespace Golpilolz\MediaLibrary\DependencyInjection;

use Golpilolz\MediaLibrary\Form\Type\GolpilolzMediaLibrarySingleType;
use Symfony\Component\AssetMapper\AssetMapperInterface;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\DependencyInjection\Extension\Extension;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\DependencyInjection\Loader;

class GolpilolzMediaLibraryExtension extends Extension implements PrependExtensionInterface
{
    public function prepend(ContainerBuilder $container): void
    {
        // Register the Dropzone form theme if TwigBundle is available
        $bundles = $container->getParameter('kernel.bundles');

        if (isset($bundles['TwigBundle'])) {
            $container->prependExtensionConfig('twig', [
                'form_themes' => [
                    '@GolpilolzMediaLibrary/Form/golpilolz_media_library_single_widget.html.twig'
                ]
            ]);
        }

        if ($this->isAssetMapperAvailable($container)) {
            $container->prependExtensionConfig('framework', [
                'asset_mapper' => [
                    'paths' => [
                        __DIR__ . '/../../assets/dist' => '@golpilolz/media-library',
                    ],
                ],
            ]);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        $loader = new Loader\YamlFileLoader($container, new FileLocator(__DIR__ . '/../../config'));
        $loader->load('services.yml');

        foreach ($config as $key => $value) {
            $container->setParameter('golpilolz_medialibrary.' . $key, $value);
        }

        $this->remapParametersNamespaces($config, $container, array(
            '' => array(
                '' => 'golpilolz_medialibrary.',
                'root_folder' => 'golpilolz_medialibrary.root_folder',
                'model_manager_name' => 'golpilolz_medialibrary.model_manager_name'
            ),
        ));

        // $this->loadFiles($config['file'], $container, $loader);
        // $this->loadFolders($config['folder'], $container, $loader);

        $container
            ->setDefinition('form.golpilolz-medialibrary-single', new Definition(GolpilolzMediaLibrarySingleType::class))
            ->addTag('form.type')
            ->setPublic(false)
        ;
    }

    public function loadFiles(array $config, ContainerBuilder $container, Loader\YamlFileLoader $loader)
    {
        $loader->load('file.yml');
        $container->setAlias('golpilolz_media-library.file_manager', $config['file_manager']);

        $this->remapParametersNamespaces($config, $container, array(
            '' => array(
                'file_class' => 'golpilolz_media-library.model.file.class',
            ),
        ));
    }

    public function loadFolders(array $config, ContainerBuilder $container, Loader\YamlFileLoader $loader)
    {
        $loader->load('folder.yml');
        $container->setAlias('golpilolz_media-library.folder_manager', $config['folder_manager']);

        $this->remapParametersNamespaces($config, $container, array(
            '' => array(
                'folder_class' => 'golpilolz_media-library.model.folder.class',
            ),
        ));
    }

    private function isAssetMapperAvailable(ContainerBuilder $container): bool
    {
        if (!interface_exists(AssetMapperInterface::class)) {
            return false;
        }

        // check that FrameworkBundle 6.3 or higher is installed
        $bundlesMetadata = $container->getParameter('kernel.bundles_metadata');
        if (!isset($bundlesMetadata['FrameworkBundle'])) {
            return false;
        }

        return is_file($bundlesMetadata['FrameworkBundle']['path'] . '/Resources/config/asset_mapper.php');
    }

    /**
     * @param array $config
     * @param ContainerBuilder $container
     * @param array $namespaces
     */
    protected function remapParametersNamespaces(array $config, ContainerBuilder $container, array $namespaces)
    {
        foreach ($namespaces as $ns => $map) {
            if ($ns) {
                if (!array_key_exists($ns, $config)) {
                    continue;
                }
                $namespaceConfig = $config[$ns];
            } else {
                $namespaceConfig = $config;
            }
            if (is_array($map)) {
                $this->remapParameters($namespaceConfig, $container, $map);
            } else {
                foreach ($namespaceConfig as $name => $value) {
                    $container->setParameter(sprintf($map, $name), $value);
                }
            }
        }
    }

    /**
     * @param array $config
     * @param ContainerBuilder $container
     * @param array $map
     */
    protected function remapParameters(array $config, ContainerBuilder $container, array $map)
    {
        foreach ($map as $name => $paramName) {
            if (array_key_exists($name, $config)) {
                $container->setParameter($paramName, $config[$name]);
            }
        }
    }
}
