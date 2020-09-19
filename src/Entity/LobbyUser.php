<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Class Cover
 *
 * @ORM\Entity()
 * @ORM\Table(name="lobbies_users")
 */
class LobbyUser
{
    public const TYPE_HOST = 'host';
    public const TYPE_PLAYER = 'player';
    public const TYPE_SPECTATOR = 'spectator';

    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\Column(type="string")
     */
    private string $role;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Lobby", inversedBy="lobbyUsers", cascade={"persist"})
     */
    private Lobby $lobby;

    /**
     * @ORM\OneToOne(targetEntity="App\Entity\User", inversedBy="currentLobby")
     */
    private User $user;

    /**
     * @return int
     */
    public function getId(): int
    {
        return $this->id;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(string $role): self
    {
        $this->role = $role;

        return $this;
    }

    public function getLobby(): ?Lobby
    {
        return $this->lobby;
    }

    public function setLobby(Lobby $lobby): self
    {
        $this->lobby = $lobby;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;

        return $this;
    }
}
