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
use Psr\Log\LoggerInterface;
use App\Message\LobbyMessage;
use App\Entity\AlternativeName;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Symfony\Component\Mercure\Update;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Envelope;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Mercure\PublisherInterface;
use Symfony\Component\Messenger\Stamp\DelayStamp;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;

class LobbyManager
{
    private PublisherInterface $publisher;
    private UrlGeneratorInterface $router;
    private EntityManagerInterface $entityManager;
    private SerializerInterface $serializer;
    private MessageBusInterface $bus;
    private GameManager $gameManager;

    public function __construct(
        PublisherInterface $publisher,
        UrlGeneratorInterface $router,
        EntityManagerInterface $entityManager,
        SerializerInterface $serializer,
        MessageBusInterface $bus,
        GameManager $gameManager
    ) {
        $this->publisher = $publisher;
        $this->router = $router;
        $this->entityManager = $entityManager;
        $this->serializer = $serializer;
        $this->bus = $bus;
        $this->gameManager = $gameManager;
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

    /**
     * @param Lobby|string $lobby
     */
    public function publishUpdateLobbyUsers($lobby): void
    {
        if (!$lobby instanceof Lobby) {
            $lobby = $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $lobby]);
            if (null === $lobby) {
                return;
            }
        }
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
                $games[] = $games[array_rand($games)];
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

        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($this->gameManager->getAllNames(), 'json'),
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
            'updateLobby'
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
            throw new UnrecoverableMessageHandlingException();
        }

        $lobby
            ->setStatus(Lobby::STATUS_PLAYING_MUSIC);

        if ($lobby->getCurrentMusic() !== null) {
            $nextLobbyMusic = $this->entityManager->getRepository(LobbyMusic::class)->findOneBy([
                'lobby' => $lobby,
                'position' => $lobby->getCurrentMusic()->getPosition() + 1,
            ]);
            $lobby->setCurrentMusic($nextLobbyMusic);
        } else {
            $lobby->setCurrentMusic($lobby->getMusics()->first());
        }
        /** @var LobbyUser $lobbyUser */
        foreach ($lobby->getUsers() as $lobbyUser) {
            $lobbyUser
                ->setAnswer(null)
                ->setAnswerDateTime(null);
        }

        $this->entityManager->flush();
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'updateLobby'
        );
        $publisher($update);
        $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_REVEAL_ANSWER), [new DelayStamp($lobby->getGuessTime() * 1000)]);
    }

    public function revealAnswer(string $lobbyCode): void
    {
        /** @var Lobby $lobby */
        $lobby = $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $lobbyCode]);
        if (null === $lobby) {
            $this->publishError($lobbyCode);
            throw new UnrecoverableMessageHandlingException();
        }
        $lobby
            ->setStatus(Lobby::STATUS_ANSWER_REVEAL);

        $this->verifyAnswers($lobby);

        $this->entityManager->flush();
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobbyCode], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user', 'lobby_answer_reveal']]),
            true,
            null,
            'updateLobby'
        );
        $publisher($update);
        $nextLobbyMusic = $this->entityManager->getRepository(LobbyMusic::class)->findOneBy([
            'lobby' => $lobby,
            'position' => $lobby->getCurrentMusic()->getPosition() + 1,
        ]);
        if (null === $nextLobbyMusic) {
            $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_FINAL_STANDING), [new DelayStamp($lobby->getGuessTime() * 1000)]);
        } else {
            $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_PLAY_MUSIC), [new DelayStamp($lobby->getGuessTime() * 1000)]);
        }
    }

    public function finalStanding(string $lobbyCode)
    {
        /** @var Lobby $lobby */
        $lobby = $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $lobbyCode]);
        if (null === $lobby) {
            $this->publishError($lobbyCode);
            throw new UnrecoverableMessageHandlingException();
        }
        $lobby
            ->setStatus(Lobby::STATUS_ANSWER_REVEAL);
    }

    private function verifyAnswers(Lobby $lobby): void
    {
        $validAnswers = [
            strtolower($lobby->getCurrentMusic()->getExpectedAnswer()->getName()),
            $lobby->getCurrentMusic()->getExpectedAnswer()->getAlternativeNames()->map(function (
                AlternativeName $alternativeName
            ) {
                return strtolower($alternativeName->getName());
            }),
        ];
        $lobbyUsers = $this->entityManager->getRepository(LobbyUser::class)->findBy([
            'disconnected' => false,
            'lobby' => $lobby
        ]);
        /** @var LobbyUser $lobbyUser */
        foreach ($lobbyUsers as $lobbyUser) {
            if (!empty($lobbyUser->getAnswer()) && in_array(strtolower($lobbyUser->getAnswer()), $validAnswers, true)) {
                $lobbyUser
                    ->setStatus(LobbyUser::STATUS_CORRECT_ANSWER)
                    ->setPoints($lobbyUser->getPoints() + 1);
            } else {
                $lobbyUser->setStatus(LobbyUser::STATUS_WRONG_ANSWER);
            }
        }
    }
}
