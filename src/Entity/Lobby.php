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
    public const STATUS_PLAYING = 'playing';

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
     * @ORM\OneToMany(targetEntity="App\Entity\LobbyUser", mappedBy="lobby", cascade={"remove"})
     */
    private Collection $lobbyUsers;

    public function __construct() {
        $this->lobbyUsers = new ArrayCollection();
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

    public function getLobbyUsers(): Collection
    {
        return $this->lobbyUsers;
    }

    public function addLobbyUser(LobbyUser $lobbyUsers): self
    {
        if (!$this->lobbyUsers->contains($lobbyUsers)) {
            $this->lobbyUsers->add($lobbyUsers);
        }

        return $this;
    }

    public function setLobbyUsers(Collection $lobbyUsers): self
    {
        $this->lobbyUsers = $lobbyUsers;

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
}
