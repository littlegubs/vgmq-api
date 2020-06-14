<?php

namespace App\Manager;

use App\Entity\Game;
use App\Entity\File;
use Aws\S3\S3Client;
use App\Entity\Music;
use App\Entity\GameMusic;
use Aws\S3\ObjectUploader;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Stof\DoctrineExtensionsBundle\Uploadable\UploadableManager;

class MusicManager
{

    private EntityManagerInterface $entityManager;
    private KernelInterface $kernel;
    private ValidatorInterface $validator;

    public function __construct(
        EntityManagerInterface $entityManager,
        KernelInterface $kernel,
        ValidatorInterface $validator
    ) {
        $this->entityManager = $entityManager;
        $this->kernel = $kernel;
        $this->validator = $validator;
    }

    public function uploadFiles(array $uploadedFiles, Game $game): void
    {
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

        /** @var UploadedFile $uploadedFile */
        foreach ($uploadedFiles as $uploadedFile) {

            $fileInfo = (new \getID3())->analyze($uploadedFile->getRealPath());
            if (array_key_exists('error', $fileInfo)) {
                throw new \Exception(current($fileInfo['error']));
            }

            $key = $game->getSlug().'/'.$uploadedFile->getClientOriginalName();
            $uploader = new ObjectUploader(
                $s3,
                'vgmq-musics',
                $key,
                fopen($uploadedFile->getRealPath(), 'rb')
            );
            $result = $uploader->upload();

            $music = (new Music())
                ->setTitle(current($fileInfo['tags']['id3v2']['title']))
                ->setArtist(isset($fileInfo['tags']['id3v2']['artist']) ? current($fileInfo['tags']['id3v2']['artist']) : null)
                ->setDuration($fileInfo['playtime_seconds'])
                ->setAwsUrl($result['ObjectURL'])
                ->setAwsKey($key);

            $gameMusic = (new GameMusic())
                ->setGame($game)
                ->setMusic($music);
            $this->entityManager->persist($gameMusic);
        }

        $this->entityManager->flush();
    }
}
