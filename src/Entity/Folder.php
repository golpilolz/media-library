<?php

namespace Golpilolz\MediaLibrary\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Golpilolz\MediaLibrary\Model\FileInterface;
use Golpilolz\MediaLibrary\Model\Folder as BaseFolder;
use Golpilolz\MediaLibrary\Model\FolderInterface;
use Golpilolz\MediaLibrary\Repository\FolderRepository;

#[ORM\Entity(repositoryClass: FolderRepository::class)]
class Folder extends BaseFolder
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    protected int $id;

    /** @var ArrayCollection<FileInterface> files */
    #[ORM\OneToMany(mappedBy: "folder", targetEntity: File::class)]
    protected Collection $files;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: "children")]
    #[ORM\JoinColumn(name: "parent_id", referencedColumnName: "id", nullable: true)]
    protected ?FolderInterface $parent;

    /** @var ArrayCollection<FolderInterface> children */
    #[ORM\OneToMany(mappedBy: "parent", targetEntity: Folder::class)]
    protected Collection $children;
}
