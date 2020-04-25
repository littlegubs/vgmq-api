<?php

namespace App\Command;

use App\Client\IgdbClient;
use App\Entity\IgdbApiStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class UpdateIgdbApiStatus extends Command
{
    protected static $defaultName = 'app:igdb:api-status';
    private EntityManagerInterface $entityManager;
    private IgdbClient $igdbClient;

    public function __construct(EntityManagerInterface $entityManager, IgdbClient $igdbClient)
    {
        $this->entityManager = $entityManager;
        $this->igdbClient = $igdbClient;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {

        $data = $this->igdbClient->execute('api_status', null, false);

        if (empty($data)) {
            return;
        }
        $data = current($data);

        $igdbApiStatus = $this->entityManager->getRepository(IgdbApiStatus::class)->findAll();

        if (empty($igdbApiStatus)) {
            $igdbApiStatus = new IgdbApiStatus();
        } else {
            $igdbApiStatus = current($igdbApiStatus);
        }

        $igdbApiStatus
            ->setAuthorized($data['authorized'])
            ->setMaxValue($data['usage_reports']['usage_report']['max_value'])
            ->setCurrentValue($data['usage_reports']['usage_report']['current_value'])
            ->setPeriodStart(new \DateTime($data['usage_reports']['usage_report']['period_start']))
            ->setPeriodEnd(new \DateTime($data['usage_reports']['usage_report']['period_end']));

        $this->entityManager->persist($igdbApiStatus);
        $this->entityManager->flush();
    }
}
