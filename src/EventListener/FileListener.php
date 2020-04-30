<?php

namespace App\EventListener;

use App\Entity\File;
use Doctrine\ORM\Events;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Event\LifecycleEventArgs;

final class FileListener implements EventSubscriber
{
    protected $publicDir;

    public function __construct(string $projectDir)
    {
        $this->publicDir = realpath($projectDir.'/public');
    }

    public function getSubscribedEvents(): array
    {
        return [
            Events::preRemove => 'preRemove',
        ];
    }

    public function preRemove(LifecycleEventArgs $args): void
    {
        $object = $args->getObject();
        if ($object instanceof File) {
            $path = $object->getPath();
            if (0 === strpos($path, 'data/music/')) {
                $path = $this->publicDir.'/'.$path;
            }
            if (file_exists($path)) {
                unlink($path);
            }
        }
    }
}
