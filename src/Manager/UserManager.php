<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Game;
use App\Client\IgdbClient;
use App\Exception\IgdbApiLimitExceeded;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserManager
{

    private EntityManagerInterface $em;
    private GameManager $gameManager;
    private IgdbApiStatusManager $igdbApiStatusManager;
    private IgdbClient $igdbClient;

    public function __construct(
        EntityManagerInterface $em,
        GameManager $gameManager,
        IgdbApiStatusManager $igdbApiStatusManager,
        IgdbClient $igdbClient
    ) {
        $this->em = $em;
        $this->gameManager = $gameManager;
        $this->igdbApiStatusManager = $igdbApiStatusManager;
        $this->igdbClient = $igdbClient;
    }

    public function updateGameList(User $user, string $igdbUsername): void
    {
        $listedGames = [];
        if ('' !== $igdbUsername) {
            if (!$this->igdbApiStatusManager->fetchAllowed()) {
                throw new IgdbApiLimitExceeded();
            }

            $privateListJson = $this->igdbClient->execute('private/lists', 'fields listed_games; where url = *"'.$igdbUsername.'"* & slug = "played";');

            if (empty($privateListJson) || !isset(current($privateListJson)['listed_games'])) {
                throw new NotFoundHttpException();
            }

            $listedGames = current($privateListJson)['listed_games'];
            // add new games to database
            $games = $this->em->getRepository(Game::class)->getAll();
            $gamesToFetch = array_diff($listedGames, array_column($games, 'igdbId'));

            $arrayChunks = array_chunk($gamesToFetch, 500);
            // if user has more than 5000 games to add
            $arrayChunksChunks = array_chunk($arrayChunks, 10);
            foreach ($arrayChunksChunks as $arrayChunk) {
                foreach ($arrayChunk as $key => $chunk) {
                    $this->gameManager->fetchGames($chunk, $key);
                }
            }

            $this->em->flush();

            // link games that already exist to user
            $gamesToAddToList = $this->em->getRepository(Game::class)->getByIgdbIds($listedGames);
            $user->setGames(new ArrayCollection($gamesToAddToList));
        }

        // deletes games from list
        $userListArray = $this->em->getRepository(Game::class)->getUserList($user);
        $gamesToRemoveFromList = array_diff(array_column($userListArray, 'igdbId'), $listedGames);
        $user
            ->setGames($user->getGames()->filter(function (Game $game) use ($gamesToRemoveFromList) {
                return !in_array($game->getIgdbId(), $gamesToRemoveFromList, true);
            }))
            ->setIgdbUsername($igdbUsername)
            ->setGameListUpdatedAt(new \DateTime());
        $this->em->persist($user);
        $this->em->flush();
    }
}
