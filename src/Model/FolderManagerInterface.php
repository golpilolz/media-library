<?php

namespace Golpilolz\MediaLibrary\Model;

interface FolderManagerInterface
{
    /**
     * @return FolderInterface
     */
    public function createFolder();

    /**
     * Returns a collection with all folder instances.
     *
     * @return \Traversable
     */
    public function findFolders();

    /**
     * Returns the folders's fully qualified class name.
     *
     * @return string
     */
    public function getClass();

    /**
     * Finds one group by the given criteria.
     *
     * @param array $criteria
     *
     * @return FolderManagerInterface
     */
    public function findFolderBy(array $criteria);

    public function findFolderById($id);

    public function findFolderByName($name);

    /**
     * Update a folder
     *
     * @param FolderInterface $folder
     */
    public function updateFolder(FolderInterface $folder);
}