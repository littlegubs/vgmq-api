<?php

namespace App\EventListener;

use App\Entity\File;
use Aws\S3\S3Client;
use App\Entity\Music;
use Doctrine\ORM\Events;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Event\LifecycleEventArgs;
use Symfony\Component\HttpKernel\KernelInterface;

final class MusicListener implements EventSubscriber
{
    private KernelInterface $kernel;

    public function __construct(KernelInterface $kernel) {
        $this->kernel = $kernel;
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
        if (($object instanceof Music) && null !== $object->getAwsKey()) {
            $s3config = [
                'version' => 'latest',
                'region' => 'eu-west-3',
            ];
            // when in dev, use the .aws/credentials folder to authenticate
            // TODO copy host .aws folder into docker container
            if ('dev' === $this->kernel->getEnvironment()) {
                $s3config['profile'] = 'default';
            }
            $s3 = new S3Client($s3config);

            $s3->deleteObject([
                'Bucket' => 'vgmq-musics',
                'Key' => $object->getAwsKey(),
            ]);
        }
    }
}
