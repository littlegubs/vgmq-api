<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Lobby;
use App\Entity\LobbyUser;
use Doctrine\ORM\EntityRepository;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use function Doctrine\ORM\QueryBuilder;

class LobbyUserRepository extends EntityRepository
{
    public function getOnePlayerByLobbyAndUser(User $user, Lobby $lobby): ?LobbyUser
    {
        $qb = $this->createQueryBuilder('lb')
            ->leftJoin('lb.user', 'u')
            ->leftJoin('lb.lobby', 'l')
            ->andWhere('u.id = :userId')
            ->andWhere('l.id = :lobbyId')
            ->andWhere('lb.role != :roleSpectator')
            ->setParameter('userId', $user->getId())
            ->setParameter('lobbyId', $lobby->getId())
            ->setParameter('roleSpectator', LobbyUser::ROLE_SPECTATOR);

        return $qb->getQuery()->getOneOrNullResult();
    }
}
