<?php

namespace Golpilolz\MediaLibrary\Model;

use Doctrine\ORM\Mapping as ORM;

abstract class File implements FileInterface
{
    const TYPE = 'file';

    protected int $id;

    protected FolderInterface $folder;

    #[ORM\Column(name: "name", type: "string", length: 255)]
    protected string $name;

    #[ORM\Column(name: "url", type: "string", length: 255)]
    protected string $url;

    public function getId(): int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName($name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function setUrl($url): static
    {
        $this->url = $url;
        return $this;
    }

    public function getFolder(): FolderInterface
    {
        return $this->folder;
    }

    public function setFolder($folder): void
    {
        $this->folder = $folder;
    }

    public function getBasename(): array|string
    {
        return pathinfo($this->getName(), PATHINFO_FILENAME);
    }
}