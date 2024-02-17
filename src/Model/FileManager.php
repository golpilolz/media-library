<?php

namespace Golpilolz\MediaLibrary\Model;

abstract class FileManager implements FileManagerInterface {
    /**
     * {@inheritdoc}
     */
    public function createFile()
    {
        $class = $this->getClass();
        return new $class();
    }
    /**
     * {@inheritdoc}
     */
    public function findFileById($id)
    {
        return $this->findFileBy(array('id' => $id));
    }

    /**
     * {@inheritdoc}
     */
    public function findFileByName($name)
    {
        return $this->findFileBy(array('name' => $name));
    }
}