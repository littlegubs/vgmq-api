<?php

namespace App\Command;

use App\Manager\GameManager;
use Symfony\Component\Stopwatch\Stopwatch;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class FetchGames extends Command
{
    protected static $defaultName = 'app:igdb:fetch-games';
    private GameManager $gameManager;

    public function __construct(GameManager $gameManager)
    {
        $this->gameManager = $gameManager;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $stopwatch = new Stopwatch();
        $stopwatch->start('command');
        $i = 0;
        $this->gameManager->setFromCommand(true);
        $stopwatch->start('lap');
        do {
            $stopwatch->reset('lap');
            $stopwatch->start('lap');
            $continue = true;
            $gamesAdded = $this->gameManager->fetchGames(null, $i);
            if (!$gamesAdded && $i === 0) {
                $continue = false;
            }
            if ($i === 10) {
                $i = 0;
            } else {
                $i++;
            }
             $output->writeln('Lap :  '.(string) $stopwatch->stop('lap'));
        } while (true === $continue);
        $stopwatch->stop('command');
    }
}
