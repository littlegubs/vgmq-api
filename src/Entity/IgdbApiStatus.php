<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity()
 */
class IgdbApiStatus
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\Column(type="boolean")
     */
    private bool $authorized;

    /**
     * @ORM\Column(type="integer")
     */
    private int $maxValue;

    /**
     * @ORM\Column(type="integer")
     */
    private int $currentValue;

    /**
     * @ORM\Column(type="datetime")
     */
    private \DateTime $periodStart;

    /**
     * @ORM\Column(type="datetime")
     */
    private \DateTime $periodEnd;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function isAuthorized(): ?bool
    {
        return $this->authorized;
    }

    public function setAuthorized(bool $authorized): IgdbApiStatus
    {
        $this->authorized = $authorized;

        return $this;
    }

    public function getMaxValue(): ?int
    {
        return $this->maxValue;
    }

    public function setMaxValue(int $maxValue): IgdbApiStatus
    {
        $this->maxValue = $maxValue;

        return $this;
    }

    public function getCurrentValue(): ?int
    {
        return $this->currentValue;
    }

    public function setCurrentValue(int $currentValue): IgdbApiStatus
    {
        $this->currentValue = $currentValue;

        return $this;
    }

    public function getPeriodStart(): ?\DateTime
    {
        return $this->periodStart;
    }

    public function setPeriodStart(\DateTime $periodStart): IgdbApiStatus
    {
        $this->periodStart = $periodStart;

        return $this;
    }

    public function getPeriodEnd(): ?\DateTime
    {
        return $this->periodEnd;
    }

    public function setPeriodEnd(\DateTime $periodEnd): IgdbApiStatus
    {
        $this->periodEnd = $periodEnd;

        return $this;
    }

    public function fetchAllowed(): bool
    {
        return $this->isAuthorized() && $this->getCurrentValue() < $this->getMaxValue();
    }
}
