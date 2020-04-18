<?php

namespace App\Manager;

use App\Entity\IgdbApiStatus;
use Doctrine\ORM\EntityManagerInterface;

class IgdbApiStatusManager
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    public function getStatus(): ?IgdbApiStatus
    {
        $igdbApiStatus = $this->em->getRepository(IgdbApiStatus::class)->findAll();

        if (empty($igdbApiStatus)) {
            return null;
        }
        /** @var IgdbApiStatus $igdbApiStatus */
        $igdbApiStatus = current($igdbApiStatus);

        return $igdbApiStatus;
    }

    public function fetchAllowed(): bool
    {
        $igdbApiStatus = $this->getStatus();

        return !(null === $igdbApiStatus || !$igdbApiStatus->fetchAllowed());
    }

    public function addToCurrentValue(): void
    {
        $igdbApiStatus = $this->getStatus();
        if (null !== $igdbApiStatus) {
            $igdbApiStatus->setCurrentValue($igdbApiStatus->getCurrentValue() + 1);

            $this->em->persist($igdbApiStatus);
            $this->em->flush();
        }
    }
}
