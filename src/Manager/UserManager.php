<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Game;
use App\Entity\Video;
use App\Entity\Cover;
use App\Entity\AlternativeName;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Common\Collections\ArrayCollection;

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

        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api-v3.igdb.com/private/lists',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_POSTFIELDS => 'fields listed_games; where url = *"'.$igdbUsername.'"* & slug = "played";',
            CURLOPT_HTTPHEADER => [
                'user-key: '.$_ENV['IGDB_USER_KEY'],
                'Content-Type: text/plain',
            ],
        ]);

        $response = curl_exec($curl);

        curl_close($curl);
        if (false === $response) {
            throw new \Exception();
        }
        $privateListJson = json_decode($response, true);

        if (empty($privateListJson)) {
            throw new \Exception();
        }
        $listedGames = current($privateListJson)['listed_games'];
        // add new games to database
        $games = $this->em->getRepository(Game::class)->getAll();
        $gamesToFetch = array_diff($listedGames, array_column($games, 'igdbId'));

        $arrayChunk = array_chunk($gamesToFetch, 500);
        foreach ($arrayChunk as $key => $chunk) {
            $this->fetchGames($games, $chunk, $key);
        }

        $this->em->flush();

        // link games that already exist to user
        $gamesToAddToList = $this->em->getRepository(Game::class)->getByIgdbIds($listedGames);
        $user->setGames(new ArrayCollection($gamesToAddToList));

        // deletes games from list
        $userListArray = $this->em->getRepository(Game::class)->getUserList($user);
        $gamesToRemoveFromList = array_diff(array_column($userListArray, 'igdbId'), $listedGames);
        $user->setGames($user->getGames()->filter(function (Game $game) use ($gamesToRemoveFromList) {
            return !in_array($game->getIgdbId(), $gamesToRemoveFromList);
        }));
        $this->em->persist($user);
        $this->em->flush();
    }

    private function fetchGames(array $games, array $data, ?int $key = null)
    {
        $curl = curl_init();

        $body = 'fields category, parent_game, url, category,alternative_names.name, cover.*, first_release_date, version_parent, name, slug, videos.video_id;
                sort popularity desc;';

        if (null !== $key) {
            $body .= 'where first_release_date != null & id = ('.implode(', ', $data).');
                limit 500; offset '.($key * 500).';';
        } else {
            $body .= 'where id = ('.implode(', ', $data).');';
        }
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api-v3.igdb.com/games',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'user-key: '.$_ENV['IGDB_USER_KEY'],
                'Content-Type: text/plain',
            ],
        ]);

        $response = curl_exec($curl);
        curl_close($curl);
        $gamesJson = json_decode($response, true);
        $parentGames = array_column($gamesJson, 'parent_game', 'id');
        $parentGames = array_diff($parentGames, array_column($games, 'igdbId'));
        // prevent from adding a parent game which has the same id has this game
        $parentGames = array_filter($parentGames, function ($value, $key) {
            return $key !== $value;
        }, ARRAY_FILTER_USE_BOTH);

        if (!empty($parentGames)) {
            $this->fetchGames($games, $parentGames);
        }

        $versionParents = array_column($gamesJson, 'version_parent', 'id');
        $versionParents = array_diff($versionParents, array_column($games, 'igdbId'));
        // prevent from adding a parent game which has the same id has this game
        $versionParents = array_filter($versionParents, function ($value, $key) {
            return $key !== $value;
        }, ARRAY_FILTER_USE_BOTH);

        if (!empty($versionParents)) {
            $this->fetchGames($games, $versionParents);
        }
        $this->em->flush();
        foreach ($gamesJson as $gameJson) {
            $this->addGame($gameJson);
        }
    }

    private function addGame(array $data)
    {
        if (null === $data['category'] || !in_array($data['category'], [1, 6], true)) {
            $date = new \DateTime();
            $date->setTimestamp($data['first_release_date']);

            $game = new Game();
            $game
                ->setIgdbId($data['id'])
                ->setName($data['name'])
                ->setSlug($data['slug'])
                ->setFirstReleaseDate($date)
                ->setUrl($data['url']);

            if (isset($data['cover'])) {
                $cover = new Cover();
                $cover
                    ->setIgdbId($data['cover']['id'])
                    ->setHeight($data['cover']['height'])
                    ->setWidth($data['cover']['width'])
                    ->setImageId($data['cover']['image_id'])
                    ->setGame($game);

                $game->setCover($cover);
            }

            $alternativeNames = new ArrayCollection();
            if (!empty($data['alternative_names'])) {
                foreach ($data['alternative_names'] as $alternativeNameArray) {
                    $alternativeName = new AlternativeName();
                    $alternativeName
                        ->setGame($game)
                        ->setName($alternativeNameArray['name'])
                        ->setIgdbId($alternativeNameArray['id']);
                    $alternativeNames->add($alternativeName);
                }
            }

            $videos = new ArrayCollection();
            if (!empty($data['videos'])) {
                $videoIds = array_column($data['videos'], 'video_id');

                // TODO use this code somewhere else to get youtube video duration
//                $curl = curl_init();
//
//                curl_setopt_array($curl, [
//                    CURLOPT_URL => "https://www.googleapis.com/youtube/v3/videos?id=".implode(',%20', $videoIds)."&part=contentDetails&fields=items(id,%20contentDetails(duration))&key=".$_ENV['YOUTUBE_GOOGLE_API_KEY'],
//                    CURLOPT_RETURNTRANSFER => true,
//                    CURLOPT_CUSTOMREQUEST => "GET",
//                ]);
//
//                $response = curl_exec($curl);
//                curl_close($curl);
//
//                $responseJson = json_decode($response, true);
//                if (isset($responseJson['items'])) {
//                    foreach ($responseJson['items'] as $item) {
//                        $igdbVideo = current(array_filter($data['videos'], function ($video) use ($item) {
//                            return isset($video['video_id']) ? $video['video_id'] === $item['id'] : false;
//                        }));
//                        $video = new Video();
//                        $video
//                            ->setGame($game)
//                            ->setIgdbId($igdbVideo['id'])
//                            ->setVideoId($item['id'])
//                            ->setDuration($item['contentDetails']['duration']);
//                        $videos->add($video);
//                    }
//                }
                foreach ($data['videos'] as $videoArray) {
                    if (is_array($videoArray)) {
                        $video = new Video();
                        $video
                            ->setGame($game)
                            ->setIgdbId($videoArray['id'])
                            ->setVideoId($videoArray['video_id']);
                        $videos->add($video);
                    }
                }
            }

            $game
                ->setAlternativeNames($alternativeNames)
                ->setVideos($videos);
            $this->em->persist($game);
        }
    }
}
