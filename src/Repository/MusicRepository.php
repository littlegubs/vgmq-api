<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Game;
use App\Entity\LobbyMusic;
use Doctrine\ORM\EntityRepository;
use Doctrine\Common\Collections\ArrayCollection;
use function Doctrine\ORM\QueryBuilder;

class MusicRepository extends EntityRepository
{
    public function getRandomByUsers(ArrayCollection $users, int $limit = 10)
    {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.games', 'gm')
            ->leftJoin('gm.game', 'g')
            ->leftJoin('g.users', 'u')
            ->andWhere('u.id in (:users)')
            ->orderBy('RAND()')
            ->setParameter('users', $users)
            ->setMaxResults($limit);

        return $qb->getQuery()->getResult();
    }

    public function getOneRandomNotAlreadyInQueueByGame(Game $game, ArrayCollection $musicsAlreadyInPlay, int $guessTime)
    {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.games', 'gm')
            ->leftJoin('gm.game', 'g')
            ->andWhere('g.id = :game')
            ->andWhere('m.duration > :guessTime')
            ->orderBy('RAND()')
            ->setParameter('game', $game->getId())
            ->setParameter('guessTime', $guessTime)
            ->setMaxResults(1);

        if (!$musicsAlreadyInPlay->isEmpty()) {
            $qb
                ->andWhere('m.id NOT IN (:musics)')
                ->setParameter('musics', $musicsAlreadyInPlay->map(static function (LobbyMusic $lobbyMusic) {
                    return $lobbyMusic->getMusic()->getId();
                }));
        }

        return $qb->getQuery()->getOneOrNullResult();
    }
}
