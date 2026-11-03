<?php

namespace Golpilolz\MediaLibrary\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Golpilolz\MediaLibrary\Repository\FolderRepository;

#[ORM\Entity(repositoryClass: FolderRepository::class)]
class Folder
{
    const string TYPE = 'folder';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    protected int $id;

    /** @var Collection<int, File> */
    #[ORM\OneToMany(mappedBy: "folder", targetEntity: File::class)]
    protected Collection $files;

    #[ORM\ManyToOne(targetEntity: Folder::class, inversedBy: "children")]
    #[ORM\JoinColumn(name: "parent_id", referencedColumnName: "id", nullable: true)]
    protected ?Folder $parent = null;

    /** @var Collection<int, Folder> */
    #[ORM\OneToMany(mappedBy: "parent", targetEntity: Folder::class)]
    protected Collection $children;

    #[ORM\Column(name: "name", type: "string", length: 255)]
    protected string $name;

    // LOCK is a reserved word in MySQL/MariaDB: backticks make Doctrine quote it.
    #[ORM\Column(name: "`lock`", type: "boolean")]
    protected bool $lock = false;

    public function __construct()
    {
        $this->files = new ArrayCollection();
        $this->children = new ArrayCollection();
    }

    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setName($name)
    {
        $this->name = $name;
        return $this;
    }

    public function isLock()
    {
        return $this->lock;
    }

    public function setLock($lock)
    {
        $this->lock = $lock;
        return $this;
    }

    public function getFiles()
    {
        return $this->files;
    }

    /**
     * Returns 0 for a root folder (the popup uses 0 as the root id).
     */
    public function getParent()
    {
        if (is_null($this->parent)) {
            return 0;
        }
        return $this->parent;
    }

    public function setParent(?Folder $parent)
    {
        $this->parent = $parent;
        return $this;
    }
}
