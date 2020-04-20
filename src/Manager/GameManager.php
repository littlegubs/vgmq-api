<?php

namespace App\Manager;

use App\Entity\Game;
use App\Entity\Cover;
use App\Entity\Video;
use App\Entity\AlternativeName;
use App\Exception\IgdbApiBadStatusCode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpClient\HttpClient;
use Doctrine\Common\Collections\ArrayCollection;
use App\Exception\IgdbApiLimitExceededDuringProcess;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class GameManager
{
    private EntityManagerInterface $em;
    private IgdbApiStatusManager $igdbApiStatusManager;
    private ValidatorInterface $validator;
    private bool $fromCommand = false;

    public function __construct(
        EntityManagerInterface $em,
        IgdbApiStatusManager $igdbApiStatusManager,
        ValidatorInterface $validator
    ) {
        $this->em = $em;
        $this->igdbApiStatusManager = $igdbApiStatusManager;
        $this->validator = $validator;
    }

    public function setFromCommand(bool $fromCommand): void
    {
        $this->fromCommand = $fromCommand;
    }

    public function fetchGames(?array $data, ?int $key = null): bool
    {
        if (!$this->igdbApiStatusManager->fetchAllowed()) {
            throw new IgdbApiLimitExceededDuringProcess();
        }

        $games = [];
        if ($this->fromCommand) {
            $gamesCount = $this->em->getRepository(Game::class)->getAll(true);
            //if we have more than 30 000 games, stops the command and avoid being banned by IGDB
            if ($gamesCount > 30000) {
                return false;
            }
            $games = $this->em->getRepository(Game::class)->getAll();
        }

        // games to not fetch until IGDB fixes them
        $buggedIgdbIds = [10942, 105413];

        $gamesToNotFetch = array_merge(array_column($games, 'igdbId'), $buggedIgdbIds);

        $body = 'fields category, parent_game, url, category,alternative_names.name, cover.*, first_release_date, version_parent, name, slug, videos.video_id;
                sort popularity desc; limit 500;';

        if (null !== $key) {
            $body .= 'offset '.($key * 500).';';
            if (null !== $data) {
                $body .= 'where first_release_date != null & id = ('.implode(', ', $data).') ';
            } else {
                // if command
                $body .= 'where first_release_date != null ';
            }
        } else {
            $body .= 'where first_release_date != null & id = ('.implode(', ', $data).') ';
        }

        $body .= !empty($gamesToNotFetch) ? '& id != ('.implode(', ', $gamesToNotFetch).');' : ';';

        $client = HttpClient::create();
        $response = $client->request('GET', 'https://api-v3.igdb.com/games', [
            'headers' => [
                'user-key' => $_ENV['IGDB_USER_KEY'],
                'Content-Type' => 'text/plain',
            ],
            'body' => $body,
        ]);

        $this->igdbApiStatusManager->addToCurrentValue();

        $statusCode = $response->getStatusCode();
        if (200 !== $statusCode) {
            throw new IgdbApiBadStatusCode();
        }

        $gamesJson = $response->toArray();

        if (empty($gamesJson)) {
            return false;
        }

        $parentGames = array_column($gamesJson, 'parent_game', 'id');
        $parentGames = array_unique($parentGames);
        $parentGames = array_diff($parentGames, array_column($games, 'igdbId'));

        // prevent from adding a parent game which has the same id has this game
        $parentGames = array_filter($parentGames, function ($value, $key) {
            return $key !== $value;
        }, ARRAY_FILTER_USE_BOTH);

        if (!empty($parentGames)) {
            $this->fetchGames($parentGames);
        }

        $versionParents = array_column($gamesJson, 'version_parent', 'id');
        $versionParents = array_unique($versionParents);
        $versionParents = array_diff($versionParents, array_column($games, 'igdbId'));

        // prevent from adding a parent game which has the same id has this game
        $versionParents = array_filter($versionParents, function ($value, $key) {
            return $key !== $value;
        }, ARRAY_FILTER_USE_BOTH);

        if (!empty($versionParents)) {
            $this->fetchGames($versionParents);
        }

        foreach ($gamesJson as $gameJson) {
            $this->addGame($gameJson);
        }

        return true;
    }

    private function addGame(array $data): void
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

            if (isset($data['cover']) && is_array($data['cover'])) {
                $cover = new Cover();
                $cover
                    ->setIgdbId($data['cover']['id'])
                    ->setHeight($data['cover']['height'] ?? null)
                    ->setWidth($data['cover']['width'] ?? null)
                    ->setImageId($data['cover']['image_id'])
                    ->setGame($game);

                $game->setCover($cover);
            }

            if (isset($data['parent_game'])) {
                /** @var Game $parentGame */
                $parentGame = $this->em->getRepository(Game::class)->findOneBy(['igdbId' => $data['parent_game']]);
                $game->setParent($parentGame);
            }

            if (isset($data['version_parent'])) {
                /** @var Game $parentVersionGame */
                $parentVersionGame = $this->em->getRepository(Game::class)->findOneBy(['igdbId' => $data['version_parent']]);
                $game->setParentVersion($parentVersionGame);
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

            if (count($this->validator->validate($game)) === 0) {
                $this->em->persist($game);
                $this->em->flush();
                $this->em->clear(AlternativeName::class);
                $this->em->clear(Video::class);
                $this->em->clear(Cover::class);
                $this->em->clear(Game::class);
            }
        }
    }
}
