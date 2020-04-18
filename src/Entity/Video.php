<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Class Video
 *
 * @ORM\Entity()
 * @ORM\Table(name="videos")
 */
class Video
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private string $id;

    /**
     * @var int|null
     * @ORM\Column(type="integer", nullable=true)
     */
    private ?int $igdbId;

    /**
     * @var string|null
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $videoId;

    /**
     * @var string
     * @ORM\Column(type="string", nullable=true)
     */
    private string $duration;

    /**
     * @var string
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $path;

    /**
     * @var Game
     * @ORM\ManyToOne(targetEntity="Game", inversedBy="videos")
     */
    private Game $game;

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getIgdbId(): ?int
    {
        return $this->igdbId;
    }

    public function setIgdbId(?int $igdbId): Video
    {
        $this->igdbId = $igdbId;

        return $this;
    }

    public function getVideoId(): ?string
    {
        return $this->videoId;
    }

    public function setVideoId(?string $videoId): Video
    {
        $this->videoId = $videoId;

        return $this;
    }

    public function getDuration(): ?string
    {
        return $this->duration;
    }

    public function setDuration(string $duration): Video
    {
        $this->duration = $duration;

        return $this;
    }

    public function getPath(): ?string
    {
        return $this->path;
    }

    public function setPath(string $path): Video
    {
        $this->path = $path;

        return $this;
    }

    public function getGame(): ?Game
    {
        return $this->game;
    }

    public function setGame(Game $game): Video
    {
        $this->game = $game;

        return $this;
    }
}
