<?php

namespace Golpilolz\MediaLibrary\Model;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

abstract class Folder implements FolderInterface
{
    const TYPE = 'folder';

    protected int $id;

    /** @var ArrayCollection<FileInterface> */
    protected Collection $files;

    protected ?FolderInterface $parent;

    /** @var ArrayCollection<FolderInterface> */
    protected Collection $children;

    #[ORM\Column(name: "name", type: "string", length: 255)]
    protected string $name;


    #[ORM\Column(name: "lock", type: "boolean")]
    protected bool $lock;

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
     * @return mixed
     */
    public function getParent()
    {
        if (is_null($this->parent)) {
            return 0;
        }
        return $this->parent;
    }

    /**
     * @param mixed $parent
     */
    public function setParent(FolderInterface $parent)
    {
        $this->parent = $parent;
    }
}