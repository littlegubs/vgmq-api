<?php

namespace App\Manager;

use App\Entity\Game;
use App\Entity\File;
use Aws\S3\S3Client;
use App\Entity\Music;
use App\Entity\GameMusic;
use App\Entity\LobbyUser;
use Aws\S3\ObjectUploader;
use App\Message\LobbyMessage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Stof\DoctrineExtensionsBundle\Uploadable\UploadableManager;

class LobbyUserManager
{

    private EntityManagerInterface $entityManager;
    private MessageBusInterface $bus;

    public function __construct(EntityManagerInterface $entityManager, MessageBusInterface $bus) {
        $this->entityManager = $entityManager;
        $this->bus = $bus;
    }

    public function handleDisconnection(LobbyUser $lobbyUser, bool $removeLobby = true): void
    {
        $lobby = $lobbyUser->getLobby();
        $lobbyUsers = $this->entityManager->getRepository(LobbyUser::class)->getConnectedExcept($lobby, $lobbyUser);

        if (empty($lobbyUsers)) {
            if($removeLobby) {
                // prevents preRemove event from looping - let postRemove do the job
                $this->entityManager->remove($lobby);
                $this->entityManager->flush();
            }
        } else if ($lobbyUser->getRole() === LobbyUser::ROLE_HOST) {
            // if host disconnected, give host role to random player
            $lobbyUser->setRole(LobbyUser::ROLE_PLAYER);
            $randomPlayer =$lobbyUsers[array_rand($lobbyUsers)];
            $randomPlayer->setRole(LobbyUser::ROLE_HOST);
            $this->entityManager->flush();
        }
        $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_UPDATE_LOBBY_USERS));
    }
}
