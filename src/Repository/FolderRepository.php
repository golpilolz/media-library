<?php

namespace Golpilolz\MediaLibrary\Repository;

use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Golpilolz\MediaLibrary\Entity\Folder;

/**
 * @extends ServiceEntityRepository<Folder>
 *
 * @method Folder|null find($id, $lockMode = null, $lockVersion = null)
 * @method Folder|null findOneBy(array $criteria, array $orderBy = null)
 * @method Folder[]    findAll()
 * @method Folder[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class FolderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Folder::class);
    }

    /**
     * Every folder with its files, in one query (getFiles() would otherwise query once per folder).
     *
     * @return Folder[]
     */
    public function findAllWithFiles(): array
    {
        return $this->createQueryBuilder('folder')
            ->leftJoin('folder.files', 'file')
            ->addSelect('file')
            ->getQuery()
            ->getResult();
    }

//    /**
//     * @return Folder[] Returns an array of Folder objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('f')
//            ->andWhere('f.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('f.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?Folder
//    {
//        return $this->createQueryBuilder('f')
//            ->andWhere('f.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
