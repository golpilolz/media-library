<?php

namespace Golpilolz\MediaLibrary\Model;

interface FolderInterface
{
    public function getId();

    public function getName();

    public function setName($name);

    public function isLock();

    public function setLock($lock);

    public function getFiles();

    public function setParent(FolderInterface $parent);
}