<?php

namespace Golpilolz\MediaLibrary\Model;

interface FileManagerInterface
{
    /**
     * Returns a collection with all folder instances.
     *
     * @return \Traversable
     */
    public function findFiles();

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
     * @return FileManagerInterface
     */
    public function findFileBy(array $criteria);

    public function findFileById($id);

    public function findFileByName($name);

    /**
     * Update a file
     *
     * @param FileInterface $file
     */
    public function updateFile(FileInterface $file);

    /**
     * Remove a file
     *
     * @param FileInterface $file
     */
    public function removeFile(FileInterface $file);
}