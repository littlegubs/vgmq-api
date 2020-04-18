<?php

namespace App\Command;

use App\Entity\Game;
use App\Manager\GameManager;
use App\Entity\IgdbApiStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class FetchGames extends Command
{
    protected static $defaultName = 'app:igdb:fetch-games';
    private EntityManagerInterface $entityManager;
    private GameManager $gameManager;

    public function __construct(EntityManagerInterface $entityManager, GameManager $gameManager)
    {
        $this->entityManager = $entityManager;
        $this->gameManager = $gameManager;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {

        $games = $this->entityManager->getRepository(Game::class)->getAll();

        for ($i = 0; $i < 5; $i++) {
            $this->gameManager->fetchGames($games, null, $i);
        }
        $this->entityManager->flush();
    }
}
