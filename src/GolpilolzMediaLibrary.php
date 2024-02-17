<?php

namespace Golpilolz\MediaLibrary;

use Golpilolz\MediaLibrary\DependencyInjection\GolpilolzMediaLibraryExtension;
use Symfony\Component\DependencyInjection\Extension\ExtensionInterface;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

class GolpilolzMediaLibrary extends AbstractBundle
{
    public function getContainerExtension(): ?ExtensionInterface
    {
        return new GolpilolzMediaLibraryExtension();
    }

    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}
