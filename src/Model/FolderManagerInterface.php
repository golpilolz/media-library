<?php

namespace Golpilolz\MediaLibrary\Model;

interface FolderManagerInterface
{
    public function createFolder(): FolderInterface;

    /**
     * Returns a collection with all folder instances.
     */
    public function findFolders(): array;

    /**
     * Returns the folders fully qualified class name.
     */
    public function getClass(): string;

    /**
     * Finds one group by the given criteria.
     *
     * @param array $criteria
     */
    public function findFolderBy(array $criteria): FolderManagerInterface;

    public function findFolderById($id);

    public function findFolderByName($name);

    /**
     * Update a folder
     */
    public function updateFolder(FolderInterface $folder);
}