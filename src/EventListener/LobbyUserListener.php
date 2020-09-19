<?php

namespace App\EventListener;

use App\Entity\File;
use Doctrine\ORM\Events;
use App\Entity\GameMusic;
use App\Entity\LobbyUser;
use Doctrine\ORM\ORMException;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\OptimisticLockException;
use Doctrine\ORM\Event\LifecycleEventArgs;

final class LobbyUserListener implements EventSubscriber
{

    public function getSubscribedEvents(): array
    {
        return [
            Events::prePersist => 'prePersist',
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
                $entity->getUser()->setCurrentLobby(null);
                $em->flush();
            }
        }
    }

    public function postRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        $em = $args->getEntityManager();
        if ($entity instanceof LobbyUser) {
            $lobby = $entity->getLobby();
            if (0 === $lobby->getLobbyUsers()->count()) {
                $em->remove($lobby);
                $em->flush();
            }
        }
    }
}
