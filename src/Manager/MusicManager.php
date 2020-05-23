<?php

namespace App\Manager;

use App\Entity\Game;
use App\Entity\File;
use App\Entity\Music;
use App\Entity\GameMusic;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Stof\DoctrineExtensionsBundle\Uploadable\UploadableManager;

class MusicManager
{

    private EntityManagerInterface $entityManager;
    private UploadableManager $uploadableManager;
    private string $projectDir;

    public function __construct(EntityManagerInterface $entityManager, UploadableManager $uploadableManager, string $projectDir)
    {
        $this->entityManager = $entityManager;
        $this->uploadableManager = $uploadableManager;
        $this->projectDir = $projectDir;
    }

    public function uploadFiles(array $uploadedFiles, Game $game): void
    {
        $this->uploadableManager->getUploadableListener()->setDefaultPath($this->projectDir.'/data/music/'.$game->getSlug());

        /** @var UploadedFile $uploadedFile */
        foreach ($uploadedFiles as $uploadedFile) {

            $fileInfo = (new \getID3())->analyze($uploadedFile->getRealPath());
            if (array_key_exists('error', $fileInfo)) {
                throw new \Exception(current($fileInfo['error']));
            }
            $file = new File();

            $this->uploadableManager->markEntityToUpload($file, $uploadedFile);
            $this->entityManager->persist($file);

            $music = (new Music())
                ->setTitle(current($fileInfo['tags']['id3v2']['title']))
                ->setArtist(isset($fileInfo['tags']['id3v2']['artist']) ? current($fileInfo['tags']['id3v2']['artist']) : null)
                ->setDuration($fileInfo['playtime_seconds'])
                ->setFile($file);

            $gameMusic = (new GameMusic())
                ->setGame($game)
                ->setMusic($music);
            $this->entityManager->persist($gameMusic);
        }

        $this->entityManager->flush();
    }
}
