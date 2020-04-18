<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\ORM\EntityRepository;
use function Doctrine\ORM\QueryBuilder;

class GameRepository extends EntityRepository
{
    public function getUserList(User $user)
    {
        $qb = $this->createQueryBuilder('g')
            ->select('g.igdbId')
            ->leftJoin('g.users', 'u')
            ->andWhere('u.id = :id')
            ->setParameter('id', $user->getId());

        return $qb->getQuery()->getResult();
    }

    public function getAll()
    {
        return $this->createQueryBuilder('g')
            ->select('g.igdbId')
            ->getQuery()->getResult();
    }

    public function getByIgdbIds(array $igdbIds)
    {
        $qb = $this->createQueryBuilder('g');
        $qb->andWhere($qb->expr()->in('g.igdbId', implode(', ', $igdbIds)));

        return $qb->getQuery()->getResult();
    }
}
