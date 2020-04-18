<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Game;
use App\Exception\IgdbApiLimitExceeded;
use App\Exception\IgdbApiBadStatusCode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpClient\HttpClient;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserManager
{

    private EntityManagerInterface $em;
    private GameManager $gameManager;
    private IgdbApiStatusManager $igdbApiStatusManager;

    public function __construct(
        EntityManagerInterface $em,
        GameManager $gameManager,
        IgdbApiStatusManager $igdbApiStatusManager
    ) {
        $this->em = $em;
        $this->gameManager = $gameManager;
        $this->igdbApiStatusManager = $igdbApiStatusManager;
    }

    public function updateGameList(User $user, string $igdbUsername): void
    {
        if (!$this->igdbApiStatusManager->fetchAllowed()) {
            throw new IgdbApiLimitExceeded();
        }

        $client = HttpClient::create();
        $response = $client->request('GET', 'https://api-v3.igdb.com/private/lists', [
            'headers' => [
                'user-key' => $_ENV['IGDB_USER_KEY'],
                'Content-Type' => 'text/plain',
            ],
            'body' => 'fields listed_games; where url = *"'.$igdbUsername.'"* & slug = "played";',
        ]);

        $this->igdbApiStatusManager->addToCurrentValue();

        $statusCode = $response->getStatusCode();
        if (200 !== $statusCode) {
            throw new IgdbApiBadStatusCode();
        }

        $privateListJson = $response->toArray();

        if (empty($privateListJson)) {
            throw new NotFoundHttpException();
        }
        $listedGames = current($privateListJson)['listed_games'];
        // add new games to database
        $games = $this->em->getRepository(Game::class)->getAll();
        $gamesToFetch = array_diff($listedGames, array_column($games, 'igdbId'));

        $arrayChunk = array_chunk($gamesToFetch, 500);
        foreach ($arrayChunk as $key => $chunk) {
            $this->gameManager->fetchGames($games, $chunk, $key);
        }

        $this->em->flush();

        // link games that already exist to user
        $gamesToAddToList = $this->em->getRepository(Game::class)->getByIgdbIds($listedGames);
        $user->setGames(new ArrayCollection($gamesToAddToList));

        // deletes games from list
        $userListArray = $this->em->getRepository(Game::class)->getUserList($user);
        $gamesToRemoveFromList = array_diff(array_column($userListArray, 'igdbId'), $listedGames);
        $user
            ->setGames($user->getGames()->filter(function (Game $game) use ($gamesToRemoveFromList) {
                return !in_array($game->getIgdbId(), $gamesToRemoveFromList);
            }))
            ->setIgdbUsername($igdbUsername)
            ->setGameListUpdatedAt(new \DateTime());
        $this->em->persist($user);
        $this->em->flush();
    }
}
