<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Class Cover
 *
 * @ORM\Entity()
 * @ORM\Table(name="lobbies")
 */
class Lobby
{
    public const STATUS_WAITING = 'waiting';
    public const STATUS_LOADING = 'loading';
    public const STATUS_PLAYING = 'playing';
    public const STATUS_PLAYING_MUSIC = 'playing_music';
    public const STATUS_ANSWER_REVEAL = 'answer_reveal';

    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\Column(type="string", unique=true)
     */
    private string $code;

    /**
     * @ORM\Column(type="string")
     */
    private ?string $name = null;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $password = null;

    /**
     * @ORM\Column(type="string")
     */
    private string $status = self::STATUS_WAITING;

    /**
     * @ORM\Column(type="integer")
     */
    private int $guessTime = 20;

    /**
     * @ORM\Column(type="integer")
     */
    private int $musicNumber = 10;

    /**
     * @ORM\Column(type="boolean")
     */
    private bool $allowDuplicates = true;

    /**
     * @ORM\OneToOne(targetEntity="App\Entity\LobbyMusic", cascade={"remove"})
     * @ORM\JoinColumn(onDelete="CASCADE")
     */
    private ?LobbyMusic $currentMusic = null;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\LobbyUser", mappedBy="lobby", cascade={"remove"})
     */
    private Collection $users;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\LobbyMusic", mappedBy="lobby", cascade={"persist", "remove"}, orphanRemoval=true)
     * @ORM\OrderBy({"position" = "ASC"})
     */
    private ?Collection $musics;

    public function __construct()
    {
        $this->users = new ArrayCollection();
        $this->musics = new ArrayCollection();
    }

    /**
     * @return int
     */
    public function getId(): int
    {
        return $this->id;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = $code;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): self
    {
        $this->password = $password;

        return $this;
    }

    public function hasPassword(): ?bool
    {
        return $this->password !== null;
    }

    public function getUsers(): Collection
    {
        return $this->users;
    }

    public function addUser(LobbyUser $lobbyUsers): self
    {
        if (!$this->users->contains($lobbyUsers)) {
            $this->users->add($lobbyUsers);
        }

        return $this;
    }

    public function setUsers(Collection $users): self
    {
        $this->users = $users;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getGuessTime(): ?int
    {
        return $this->guessTime;
    }

    public function setGuessTime(int $guessTime): self
    {
        $this->guessTime = $guessTime;

        return $this;
    }

    public function getMusicNumber(): ?int
    {
        return $this->musicNumber;
    }

    public function setMusicNumber(int $musicNumber): self
    {
        $this->musicNumber = $musicNumber;

        return $this;
    }

    public function allowDuplicates(): ?bool
    {
        return $this->allowDuplicates;
    }

    public function setAllowDuplicates(bool $allowDuplicates): self
    {
        $this->allowDuplicates = $allowDuplicates;

        return $this;
    }

    public function getMusics(): ?Collection
    {
        return $this->musics;
    }

    public function setMusics(?Collection $musics): self
    {
        $this->musics = $musics;

        return $this;
    }

    public function countMusics(): int
    {
        return $this->musics->count();
    }

    public function  getCurrentMusic(): ?LobbyMusic
    {
        return $this->currentMusic;
    }

    public function setCurrentMusic(?LobbyMusic $currentMusic): self
    {
        $this->currentMusic = $currentMusic;

        return $this;
    }

}
