<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Class Cover
 *
 * @ORM\Entity()
 * @ORM\Table(name="covers")
 */
class Cover
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @var int
     * @ORM\Column(type="integer")
     */
    private int $igdbId;

    /**
     * @var string
     * @ORM\Column(type="string")
     */
    private string $imageId;

    /**
     * @var int
     * @ORM\Column(type="integer", nullable=true)
     */
    private ?int $height;

    /**
     * @var int
     * @ORM\Column(type="integer", nullable=true)
     */
    private ?int $width;

    /**
     * @var Game
     * @ORM\OneToOne(targetEntity="Game", mappedBy="cover")
     */
    private Game $game;

    /**
     * @return int
     */
    public function getId(): int
    {
        return $this->id;
    }


    public function getIgdbId(): int
    {
        return $this->igdbId;
    }

    public function getImageId(): string
    {
        return $this->imageId;
    }

    public function setIgdbId(int $igdbId): Cover
    {
        $this->igdbId = $igdbId;

        return $this;
    }

    public function setImageId(string $imageId): self
    {
        $this->imageId = $imageId;

        return $this;
    }

    public function getHeight(): ?int
    {
        return $this->height;
    }

    public function setHeight(?int $height): self
    {
        $this->height = $height;

        return $this;
    }

    public function getWidth(): ?int
    {
        return $this->width;
    }

    public function setWidth(?int $width): self
    {
        $this->width = $width;

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
