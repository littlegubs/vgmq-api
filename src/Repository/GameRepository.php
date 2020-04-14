<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\ORM\EntityRepository;

class GameRepository extends EntityRepository
{
    public function getUserList(User $user, bool $returnIgdbArray = false)
    {
        $qb = $this->createQueryBuilder('g')
            ->leftJoin('g.users', 'u')
            ->andWhere('u.id = :id')
            ->setParameter('id', $user->getId());

        if ($returnIgdbArray) {
            $qb->select('g.id, g.igdbId');

            return $qb->getQuery()->getScalarResult();
        }

        return $qb->getQuery()->getResult();
    }
}
