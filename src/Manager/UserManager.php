<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Game;
use Doctrine\ORM\EntityManagerInterface;

class UserManager
{

    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    public function updateGameList(User $user, string $igdbUsername)
    {
        $curl = curl_init();

        //TODO remove CURLOPT_SSL_VERIFYHOST => 0 & CURLOPT_SSL_VERIFYPEER => 0 before production
        curl_setopt_array($curl, [
            CURLOPT_URL => "https://api-v3.igdb.com/private/lists",
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_POSTFIELDS => "fields listed_games; where url = *\"".$igdbUsername."\"* & slug = \"played\";",
            CURLOPT_HTTPHEADER => [
                "user-key: ".$_ENV['IGDB_USER_KEY'],
                "Content-Type: text/plain",
            ],
        ]);

        $response = curl_exec($curl);

        curl_close($curl);
        if (false === $response) {
            throw new \Exception();
        }
        $data = json_decode($response, true);

        if (empty($data)) {
            throw new \Exception();
        }
        $listedGames = current($data)['listed_games'];
unset($listedGames[0]);
        $userListArray = $this->em->getRepository(Game::class)->getUserList($user, true);
        dump($userListArray); die;
        $userListIgdbIds = array_column($userListArray, "igdbId");
        $gamesToAddToList = array_diff($listedGames, $userListIgdbIds);
        $gamesToRemoveFromList = array_diff($userListIgdbIds, $listedGames);
        $userList = $user->getGames();
        dump($listedGames);
        dump($gamesToAddToList);
        dump($gamesToRemoveFromList);
        dump($userList);
        foreach ($gamesToRemoveFromList as $key => $gameRaw) {
            dump($userList->indexOf($userListArray[$key]['id']));
        }
        die;
//        $user->setGames($userList);
        $this->em->persist($user);
        $this->em->flush();
    }
}
