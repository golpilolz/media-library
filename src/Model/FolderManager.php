<?php

namespace Golpilolz\MediaLibrary\Model;

abstract class FolderManager implements FolderManagerInterface{
    /**
     * {@inheritdoc}
     */
    public function createFolder()
    {
        $class = $this->getClass();
        return new $class();
    }
    /**
     * {@inheritdoc}
     */
    public function findFolderById($id)
    {
        return $this->findFolderBy(array('id' => $id));
    }

    /**
     * {@inheritdoc}
     */
    public function findFolderByName($name)
    {
        return $this->findFolderBy(array('name' => $name));
    }
}