<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\ORM\EntityRepository;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use function Doctrine\ORM\QueryBuilder;

class AlternativeNameRepository extends EntityRepository
{
    public function getAllNames()
    {
        $qb = $this->createQueryBuilder('an')
            ->select('an.name')
            ->andWhere('an.enabled = 1');

        return $qb->getQuery()->getResult();
    }
}
