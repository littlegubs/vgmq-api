<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * @ORM\Entity(repositoryClass="App\Repository\UserRepository")
 * @ORM\Table(name="users")
 */
class User implements UserInterface
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private string $id;

    /**
     * @ORM\Column(type="string", length=20, unique=true)
     */
    private ?string $username;

    /**
     * @ORM\Column(type="string", length=180, unique=true)
     */
    private ?string $email;

    /**
     * @ORM\Column(type="json")
     */
    private array $roles = [];

    /**
     * @var string The hashed password
     * @ORM\Column(type="string")
     */
    private string $password;

    private ?string $plainPassword;

    /**
     * @ORM\Column(type="boolean")
     */
    private bool $enabled = false;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $igdbUsername;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private ?\DateTime $gameListUpdatedAt;

    /**
     * @var Game[] | ArrayCollection
     * @ORM\ManyToMany(targetEntity="Game", inversedBy="users")
     * @ORM\JoinTable(name="users_games")
     */
    private Collection $games;

    /**
     * @ORM\OneToOne(targetEntity="App\Entity\LobbyUser", mappedBy="user", cascade={"remove"})
     */
    private ?LobbyUser $currentLobby;

    public function __construct()
    {
        $this->games = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail($email): self
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUsername(): string
    {
        return (string) $this->username;
    }

    public function setUsername($username): self
    {
        $this->username = $username;

        return $this;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see UserInterface
     */
    public function getPassword(): string
    {
        return (string) $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;

        return $this;
    }

    /**
     * @return string
     */
    public function getPlainPassword(): string
    {
        return $this->plainPassword;
    }

    /**
     * @param string $plainPassword
     *
     * @return $this
     */
    public function setPlainPassword($plainPassword)
    {
        $this->plainPassword = $plainPassword;

        return $this;
    }

    /**
     * @see UserInterface
     */
    public function getSalt()
    {
        // not needed when using the "bcrypt" algorithm in security.yaml
    }

    /**
     * @see UserInterface
     */
    public function eraseCredentials()
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
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

    public function getIgdbUsername(): ?string
    {
        return $this->igdbUsername;
    }

    public function setIgdbUsername(?string $igdbUsername): User
    {
        $this->igdbUsername = $igdbUsername;

        return $this;
    }

    public function getGameListUpdatedAt(): ?\DateTime
    {
        return $this->gameListUpdatedAt;
    }

    public function setGameListUpdatedAt(?\DateTime $gameListUpdatedAt): User
    {
        $this->gameListUpdatedAt = $gameListUpdatedAt;

        return $this;
    }

    public function getGames()
    {
        return $this->games;
    }

    public function setGames($games): User
    {
        $this->games = $games;

        return $this;
    }

    public function getCurrentLobby(): ?LobbyUser
    {
        return $this->currentLobby;
    }

    public function setCurrentLobby(?LobbyUser $currentLobby): self
    {
        $this->currentLobby = $currentLobby;

        return $this;
    }
}
