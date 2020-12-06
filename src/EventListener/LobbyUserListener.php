<?php

namespace App\EventListener;

use App\Entity\File;
use Doctrine\ORM\Events;
use App\Entity\GameMusic;
use App\Entity\LobbyUser;
use App\Message\LobbyMessage;
use Doctrine\ORM\ORMException;
use App\Manager\LobbyUserManager;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\OptimisticLockException;
use Doctrine\ORM\Event\LifecycleEventArgs;
use Symfony\Component\Messenger\MessageBusInterface;

final class LobbyUserListener implements EventSubscriber
{
    private LobbyUserManager $lobbyUserManager;

    public function __construct(LobbyUserManager $lobbyUserManager)
    {
        $this->lobbyUserManager = $lobbyUserManager;
    }

    public function getSubscribedEvents(): array
    {
        return [
            Events::prePersist => 'prePersist',
            Events::postUpdate => 'postUpdate',
            Events::preRemove => 'preRemove',
            Events::postRemove => 'postRemove',
        ];
    }

    public function prePersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        $em = $args->getEntityManager();
        if ($entity instanceof LobbyUser) {
            $lobbiesUser = $em->getRepository(LobbyUser::class)->findBy(['user' => $entity->getUser()]);
            if (!empty($lobbiesUser)) {
                foreach ($lobbiesUser as $lobbyUser) {
                    $em->remove($lobbyUser);
                }
                $em->flush();
                $entity->getUser()->setCurrentLobby($entity);
            }
        }
    }

    public function postUpdate(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        if ($entity instanceof LobbyUser) {
            $uow = $args->getEntityManager()->getUnitOfWork()->getEntityChangeSet($entity);
            // if a user disconnect from lobby
            if (isset($uow['disconnected']) && $uow['disconnected'][1] === true) {
                $this->lobbyUserManager->handleDisconnection($entity);
            }
        }
    }

    public function preRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        if ($entity instanceof LobbyUser) {
            $this->lobbyUserManager->handleDisconnection($entity, false);
        }
    }

    public function postRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        $em = $args->getEntityManager();
        if ($entity instanceof LobbyUser) {
            $lobby = $entity->getLobby();
            $lobbyUsers =$em->getRepository(LobbyUser::class)->findBy([
                'disconnected' => false,
                'lobby' => $lobby
            ]);
            if (empty($lobbyUsers)) {
                $em->remove($lobby);
            }
        }
    }
}
