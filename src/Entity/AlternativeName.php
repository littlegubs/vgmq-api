<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Class AlternativeName
 *
 * @ORM\Entity()
 * @ORM\Table(name="alternative_names")
 */
class AlternativeName
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private string $id;

    /**
     * @var int
     * @ORM\Column(type="integer")
     */
    private int $igdbId;

    /**
     * @var string
     * @ORM\Column(type="string")
     */
    private string $name;

    /**
     * @var bool
     * @ORM\Column(type="boolean")
     */
    private bool $enabled = true;

    /**
     * @var Game
     * @ORM\ManyToOne(targetEntity="Game", inversedBy="alternativeNames")
     */
    private Game $game;

    public function getId(): string
    {
        return $this->id;
    }

    public function getIgdbId(): ?int
    {
        return $this->igdbId;
    }

    public function setIgdbId(int $igdbId): AlternativeName
    {
        $this->igdbId = $igdbId;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): self
    {
        $this->enabled = $enabled;

        return $this;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function setGame(Game $game): self
    {
        $this->game = $game;

        return $this;
    }

}
