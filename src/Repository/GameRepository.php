<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\ORM\EntityRepository;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
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

    public function getAll(bool $count = false)
    {
        $qb = $this->createQueryBuilder('g');
        if ($count) {
            $qb->select('COUNT(DISTINCT g.id)');

            return $qb->getQuery()->getSingleScalarResult();
        }
        $qb
            ->select('g.igdbId');

        return $qb->getQuery()->getResult();
    }

    public function getByIgdbIds(array $igdbIds)
    {
        $qb = $this->createQueryBuilder('g');
        $qb->andWhere($qb->expr()->in('g.igdbId', implode(', ', $igdbIds)));

        return $qb->getQuery()->getResult();
    }

    public function querySearch(string $query = '', bool $showDisabled = false)
    {
        $qb = $this->createQueryBuilder('g');
        $qb->leftJoin('g.alternativeNames', 'an');

        if (!empty($query)) {
            $qb->andWhere($qb->expr()->orX(
                $qb->expr()->like('g.name', ':query'),
                $qb->expr()->andX(
                    $qb->expr()->like('an.name', ':query'),
                    $qb->expr()->eq('an.enabled', true)
                )
            ))
                ->setParameter('query', '%'.$query.'%');
        }

        if (!$showDisabled) {
            $qb->andWhere($qb->expr()->eq('g.enabled', true));
        }

        $qb
            ->groupBy('g.id')
            ->setMaxResults(50);

        return $qb;
    }

    public function getPlayedByUsers(Collection $users, int $limit = 10)
    {
        $qb = $this
            ->createQueryBuilder('g')
            ->leftJoin('g.users', 'u')
            ->andWhere('u.id in (:users)')
            ->orderBy('RAND()')
            ->setParameter('users', $users)
            ->setMaxResults($limit);

        return $qb->getQuery()->getResult();
    }

    public function getAllNames()
    {
        $qb = $this->createQueryBuilder('g')
            ->select('g.name')
            ->andWhere('g.enabled = 1');

        return $qb->getQuery()->getResult();
    }
}
