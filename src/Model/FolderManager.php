<?php

namespace Golpilolz\MediaLibrary\Model;

abstract class FolderManager implements FolderManagerInterface{
    /**
     * {@inheritdoc}
     */
    public function createFolder(): FolderInterface
    {
        $class = $this->getClass();
        return new $class();
    }
    /**
     * {@inheritdoc}
     */
    public function findFolderById($id): FolderManagerInterface
    {
        return $this->findFolderBy(array('id' => $id));
    }

    /**
     * {@inheritdoc}
     */
    public function findFolderByName($name): FolderManagerInterface
    {
        return $this->findFolderBy(array('name' => $name));
    }
}