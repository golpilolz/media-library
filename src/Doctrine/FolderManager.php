<?php

namespace Golpilolz\MediaLibrary\Doctrine;

use Doctrine\Persistence\ObjectManager;
use Doctrine\Persistence\ObjectRepository;
use Golpilolz\MediaLibrary\Model\FolderInterface;
use Golpilolz\MediaLibrary\Model\FolderManager as BaseFolderManager;
use Golpilolz\MediaLibrary\Model\FolderManagerInterface;

class FolderManager extends BaseFolderManager
{
    protected ObjectManager $objectManager;

    protected string $class;

    protected ObjectRepository $repository;

    /**
     * FolderManager constructor.
     *
     * @param ObjectManager $om
     * @param string $class
     */
    public function __construct(ObjectManager $om, string $class)
    {
        $this->objectManager = $om;
        $this->repository = $om->getRepository($class);
        $metadata = $om->getClassMetadata($class);
        $this->class = $metadata->getName();
    }

    /**
     * {@inheritdoc}
     */
    public function getClass(): string
    {
        return $this->class;
    }

    /**
     * {@inheritdoc}
     */
    public function findFolderBy(array $criteria): FolderManagerInterface
    {
        return $this->repository->findOneBy($criteria);
    }

    /**
     * {@inheritdoc}
     */
    public function findFolders(): array
    {
        return $this->repository->findAll();
    }

    /**
     * {@inheritdoc}
     */
    public function updateFolder(FolderInterface $folder, $andFlush = true): void
    {
        $this->objectManager->persist($folder);
        if ($andFlush) {
            $this->objectManager->flush();
        }
    }
}