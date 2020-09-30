<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Game;
use App\Entity\Lobby;
use App\Entity\Music;
use Lcobucci\JWT\Builder;
use App\Entity\LobbyUser;
use App\Entity\LobbyMusic;
use Lcobucci\JWT\Signer\Key;
use App\Message\LobbyMessage;
use App\Entity\AlternativeName;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Symfony\Component\Mercure\Update;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Mercure\PublisherInterface;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class LobbyManager
{
    private PublisherInterface $publisher;
    private UrlGeneratorInterface $router;
    private EntityManagerInterface $entityManager;
    private SerializerInterface $serializer;
    private MessageBusInterface $bus;

    public function __construct(
        PublisherInterface $publisher,
        UrlGeneratorInterface $router,
        EntityManagerInterface $entityManager,
        SerializerInterface $serializer,
        MessageBusInterface $bus
    ) {
        $this->publisher = $publisher;
        $this->router = $router;
        $this->entityManager = $entityManager;
        $this->serializer = $serializer;
        $this->bus = $bus;
    }

    public function publishUpdate(Lobby $lobby): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'configUpdated'
        );
        $publisher($update);
    }

    public function publishStatusUpdate(Lobby $lobby): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL),
            $lobby->getStatus(),
            true,
            null,
            'updateLobbyStatus'
        );
        $publisher($update);
    }

    public function publishUpdateLobbyUsers(Lobby $lobby): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby->getUsers(), 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'updateLobbyUsers'
        );
        $publisher($update);
    }

    public function publishError(string $lobbyCode): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            'An error occured',
            true,
            null,
            'error'
        );
        $publisher($update);
    }

    public function generateCode(): string
    {
        $str = str_split('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        do {
            $code = '';
            for ($i = 0; $i < 4; $i++) {
                $code .= $str[array_rand($str)];
            }
        } while (null !== $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $code]));

        return $code;
    }

    public function loadMusics(string $lobbyCode): void
    {
        /** @var Lobby $lobby */
        $lobby = $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $lobbyCode]);
        if (null === $lobby) {
            $this->publishError($lobbyCode);
        }

        $users = $lobby->getUsers()->map(static function (LobbyUser $lobbyUser) {
            return $lobbyUser->getUser();
        });
        $games = $this->entityManager->getRepository(Game::class)->getPlayedByUsers($users, $lobby->getMusicNumber());
        if ($lobby->allowDuplicates() && count($games) < $lobby->getMusicNumber()) {
            do {
                $games[] = array_rand($games);
            } while (count($games) < $lobby->getMusicNumber());
        }

        $lobbyMusics = new ArrayCollection();
        foreach ($games as $key => $game) {
            /** @var ?Music $music */
            $music = $this->entityManager->getRepository(Music::class)->getOneRandomNotAlreadyInQueueByGame($game, $lobbyMusics, $lobby->getGuessTime());
            if (null !== $music) {
                $lobbyMusics->add((new LobbyMusic())
                    ->setLobby($lobby)
                    ->setPosition($key + 1)
                    ->setMusic($music)
                    ->setExpectedAnswer($game)
                    ->setStartAt(random_int(0, $music->getDuration() - $lobby->getGuessTime())));
            }
        }
        if ($lobbyMusics->isEmpty()) {
            $lobby->setStatus(Lobby::STATUS_WAITING);
            $this->entityManager->flush();

            $this->publishStatusUpdate($lobby);

            return;
        }
        $lobby
            ->setMusics($lobbyMusics)
            ->setStatus(Lobby::STATUS_PLAYING);
        $this->entityManager->flush();

        $publisher = $this->publisher;

        $gameNames = $this->entityManager->getRepository(Game::class)->getAllNames();
        $alternativeNames = $this->entityManager->getRepository(AlternativeName::class)->getAllNames();
        $names = array_column(array_merge($gameNames, $alternativeNames), 'name');
        $names = array_unique($names);
        sort($names);
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($names, 'json'),
            true,
            null,
            'availableGameChoices'
        );
        $publisher($update);

        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'lobbyStart'
        );
        $publisher($update);
        $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_PLAY_MUSIC));
    }

    public function playMusic(string $lobbyCode): void
    {
        /** @var Lobby $lobby */
        $lobby = $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $lobbyCode]);
        if (null === $lobby) {
            $this->publishError($lobbyCode);
        }

        $lobby
            ->setStatus(Lobby::STATUS_PLAYING_MUSIC)
            ->setCurrentMusic($lobby->getCurrentMusic() === null ? $lobby->getMusics()->first() : $lobby->getMusics()->get(
                $lobby->getMusics()->indexOf(static function (LobbyMusic $lobbyMusic) use ($lobby) {
                    return $lobbyMusic->getPosition() === $lobby->getCurrentMusic()->getPosition() + 1;
                })));

        $this->entityManager->flush();
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'lobbyPlayMusic'
        );
        $publisher($update);
//
//        sleep(20);
//        $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_REVEAL_ANSWER));
    }
}
