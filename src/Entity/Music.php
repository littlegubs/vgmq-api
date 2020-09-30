<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * @ORM\Entity(repositoryClass="App\Repository\MusicRepository")
 * @ORM\Table(name="musics")
 */
class Music
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\Column(type="string")
     */
    private ?string $title;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private string $artist;

    /**
     * @ORM\Column(type="float")
     */
    private float $duration;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private ?float $guessAccuracy = null;

    /**
     * @ORM\Column(type="integer")
     */
    private int $playNumber = 0;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $awsUrl;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $awsKey;

    /**
     * @ORM\OneToOne(targetEntity="File", cascade={"remove"})
     */
    private File $file;

    /**
     * @var GameMusic[] | ArrayCollection
     * @ORM\OneToMany(targetEntity="App\Entity\GameMusic", mappedBy="music", cascade={"remove"})
     */
    private Collection $games;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\LobbyMusic", mappedBy="music")
     */
    private Collection $lobbies;

    public function __construct()
    {
        $this->games = new ArrayCollection();
        $this->lobbies = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): Music
    {
        $this->title = $title;

        return $this;
    }

    public function getArtist(): ?string
    {
        return $this->artist;
    }

    public function setArtist(string $artist): Music
    {
        $this->artist = $artist;

        return $this;
    }

    public function getDuration(): ?float
    {
        return $this->duration;
    }

    public function setDuration(float $duration): Music
    {
        $this->duration = $duration;

        return $this;
    }

    public function getGuessAccuracy(): ?float
    {
        return $this->guessAccuracy;
    }

    public function setGuessAccuracy(float $guessAccuracy): Music
    {
        $this->guessAccuracy = $guessAccuracy;

        return $this;
    }

    public function getPlayNumber(): ?int
    {
        return $this->playNumber;
    }

    public function setPlayNumber(int $playNumber): Music
    {
        $this->playNumber = $playNumber;

        return $this;
    }

    public function getAwsUrl(): ?string
    {
        return $this->awsUrl;
    }

    public function setAwsUrl(?string $awsUrl): Music
    {
        $this->awsUrl = $awsUrl;

        return $this;
    }

    public function getAwsKey(): ?string
    {
        return $this->awsKey;
    }

    public function setAwsKey(?string $awsKey): Music
    {
        $this->awsKey = $awsKey;

        return $this;
    }

    public function getFile(): ?File
    {
        return $this->file;
    }

    public function setFile(File $file): Music
    {
        $this->file = $file;

        return $this;
    }

    public function getGames(): Collection
    {
        return $this->games;
    }

    public function setGames(Collection $games): Music
    {
        $this->games = $games;

        return $this;
    }

    public function getLobbies(): Collection
    {
        return $this->lobbies;
    }

    public function setLobbies(Collection $lobbies): self
    {
        $this->lobbies = $lobbies;

        return $this;
    }
}
