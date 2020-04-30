<?php

namespace App\Command;

use App\Entity\Game;
use App\Entity\File;
use App\Entity\Music;
use App\Entity\GameMusic;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\ProgressBar;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Console\Question\ConfirmationQuestion;
use Stof\DoctrineExtensionsBundle\Uploadable\UploadableManager;

class ImportMusic extends Command
{
    protected static $defaultName = 'app:music:import';
    private EntityManagerInterface $entityManager;
    private UploadableManager $uploadableManager;
    private string $projectDir;

    public function __construct(EntityManagerInterface $entityManager, UploadableManager $uploadableManager, $projectDir)
    {
        $this->entityManager = $entityManager;
        $this->uploadableManager = $uploadableManager;
        $this->projectDir = $projectDir;
        parent::__construct();
    }

    public function execute(InputInterface $input, OutputInterface $output)
    {

        $helper = $this->getHelper('question');
        $question = new ConfirmationQuestion('This will delete all musics and files in the database, do you want to continue? (y/n) ', false);

        if (!$helper->ask($input, $output, $question)) {
            return 0;
        }

        if (false === $this->clearDatabaseTable()) {
            return 0;
        }

        ProgressBar::setFormatDefinition('custom', ' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s% -- %message%');
        $progressBar = new ProgressBar($output);
        $progressBar->setFormat('custom');

        $reader = IOFactory::createReader('Csv');
        $data = $reader->load('data/music_import/data.csv');
        $dataArray = $data->getActiveSheet()->toArray();

        $progressBar->setMaxSteps(count($dataArray) - 1);

        $igdbId = null;
        foreach ($dataArray as $key => $row) {
            if (0 !== $key) {
                $progressBar->setMessage('importing '.$row[4].'...');

                // prevents from calling the database too much time
                if (null === $igdbId || $igdbId !== $row[1]) {
                    $igdbId = $row[1];
                    /** @var Game $game */
                    $game = $this->entityManager->getRepository(Game::class)->findOneBy(['igdbId' => $row[1]]);
                }

                if (null !== $game) {
                    $fileInfo = (new \getID3())->analyze('data/music_import/'.$row[4]);
                    if (array_key_exists('error', $fileInfo)) {
                        throw new \Exception(current($fileInfo['error']));
                    }
                    $file = new File();

                    $this->uploadableManager->getUploadableListener()->setDefaultPath('data/music/'.$game->getSlug());

                    $this->uploadableManager->markEntityToUpload($file, new UploadedFile($fileInfo['filenamepath'], $fileInfo['filename']));
                    $this->entityManager->persist($file);
                    $this->entityManager->flush();

                    $music = (new Music())
                        ->setTitle(isset($fileInfo['tags']['id3v2']['title']) ? current($fileInfo['tags']['id3v2']['title']) : $row[2])
                        ->setArtist(isset($fileInfo['tags']['id3v2']['artist']) ? current($fileInfo['tags']['id3v2']['artist']) : $row[3])
                        ->setDuration($fileInfo['playtime_seconds'])
                        ->setFile($file);

                    $gameMusic = (new GameMusic())
                        ->setGame($game)
                        ->setMusic($music);
                    $this->entityManager->persist($gameMusic);

                    if (null !== $row[6]) {
                        foreach (explode(PHP_EOL, $row[6]) as $gameId) {
                            /** @var Game $alsoAppearInGame */
                            $alsoAppearInGame = $this->entityManager->getRepository(Game::class)->findOneBy(['igdbId' => $gameId]);
                            if (null !== $alsoAppearInGame) {
                                $gameMusic = (new GameMusic())
                                    ->setGame($alsoAppearInGame)
                                    ->setMusic($music);
                                $this->entityManager->persist($gameMusic);
                            }
                        }
                    }

                    $this->entityManager->flush();
                }
                $progressBar->advance();
            }
        }
    }

    private function clearDatabaseTable()
    {
        $mcmd = $this->entityManager->getClassMetadata(Music::class);
        $gmcmd = $this->entityManager->getClassMetadata(GameMusic::class);
        $fcmd = $this->entityManager->getClassMetadata(File::class);
        $connection = $this->entityManager->getConnection();
        $connection->beginTransaction();
        try {
            // delete musics
            $connection->query('DELETE FROM '.$gmcmd->getTableName().' WHERE 1');
            $connection->query('ALTER TABLE '.$gmcmd->getTableName().' AUTO_INCREMENT = 1');
            $connection->query('DELETE FROM '.$mcmd->getTableName().' WHERE 1');
            $connection->query('ALTER TABLE '.$mcmd->getTableName().' AUTO_INCREMENT = 1');

            // delete files
            $connection->query('DELETE FROM '.$fcmd->getTableName().' WHERE '.$fcmd->getColumnName('path'). ' LIKE "data/music/%"');
            $connection->query('ALTER TABLE '.$fcmd->getTableName().' AUTO_INCREMENT = 1');
            return $connection;
        } catch (\Exception $e) {
            $connection->rollBack();
        }

        return false;
    }
}
