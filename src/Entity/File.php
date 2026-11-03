<?php

namespace Golpilolz\MediaLibrary\Entity;

use Doctrine\ORM\Mapping as ORM;
use Golpilolz\MediaLibrary\Model\File as BaseFile;
use Golpilolz\MediaLibrary\Model\FolderInterface;
use Golpilolz\MediaLibrary\Repository\FileRepository;

#[ORM\Entity(repositoryClass: FileRepository::class)]
class File extends BaseFile
{
    const string TYPE = 'file';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    protected int $id;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: "files")]
    #[ORM\JoinColumn(name: "folder_id", referencedColumnName: "id", nullable: true)]
    protected FolderInterface $folder;

    #[ORM\Column(name: "name", type: "string", length: 255)]
    protected string $name;

    #[ORM\Column(name: "url", type: "string", length: 255)]
    protected string $url;
}
