<?php

namespace App\EventListener;

use App\Entity\File;
use Doctrine\ORM\Events;
use App\Entity\GameMusic;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Event\LifecycleEventArgs;

final class GameMusicListener implements EventSubscriber
{

    public function getSubscribedEvents(): array
    {
        return [
            Events::postRemove => 'postRemove',
        ];
    }

    public function postRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getEntity();
        $em = $args->getEntityManager();
        if ($entity instanceof GameMusic) {
            $music = $entity->getMusic();
            if (0 === $music->getGames()->count()) {
                $em->remove($music);
                $em->flush();
            }
        }
    }
}
