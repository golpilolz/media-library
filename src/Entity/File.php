<?php

namespace Golpilolz\MediaLibrary\Entity;

use Doctrine\ORM\Mapping as ORM;
use Golpilolz\MediaLibrary\Repository\FileRepository;

#[ORM\Entity(repositoryClass: FileRepository::class)]
class File
{
    const string TYPE = 'file';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    protected int $id;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: "files")]
    #[ORM\JoinColumn(name: "folder_id", referencedColumnName: "id", nullable: true)]
    protected Folder $folder;

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

    public function getFolder(): Folder
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
