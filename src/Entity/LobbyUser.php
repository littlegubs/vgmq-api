<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Class Cover
 *
 * @ORM\Entity(repositoryClass="App\Repository\LobbyUserRepository")
 * @ORM\Table(name="lobbies_users")
 */
class LobbyUser
{
    public const ROLE_HOST = 'host';
    public const ROLE_PLAYER = 'player';
    public const ROLE_SPECTATOR = 'spectator';

    public const STATUS_CORRECT_ANSWER = 'correct_answer';
    public const STATUS_WRONG_ANSWER = 'wrong_answer';

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
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $answer = null;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private ?\DateTime $answerDateTime;

    /**
     * @ORM\Column(type="integer")
     */
    private int $points = 0;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private ?string $status = null;

    /**
     * @ORM\Column(type="boolean")
     */
    private bool $disconnected = false;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Lobby", inversedBy="users", cascade={"persist"})
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

    public function getAnswer(): ?string
    {
        return $this->answer;
    }

    public function setAnswer(?string $answer): self
    {
        $this->answer = $answer;

        return $this;
    }

    public function getAnswerDateTime(): ?\DateTime
    {
        return $this->answerDateTime;
    }

    public function setAnswerDateTime(?\DateTime $answerDateTime): self
    {
        $this->answerDateTime = $answerDateTime;

        return $this;
    }

    public function answered(): ?bool
    {
        return $this->answer !== null;
    }

    public function getPoints(): int
    {
        return $this->points;
    }

    public function setPoints(int $points): self
    {
        $this->points = $points;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): LobbyUser
    {
        $this->status = $status;

        return $this;
    }

    public function isDisconnected(): ?bool
    {
        return $this->disconnected;
    }

    public function setDisconnected(bool $disconnected): LobbyUser
    {
        $this->disconnected = $disconnected;

        return $this;
    }

    public function getLobby(): Lobby
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

    public function reset(): self {
        $this
            ->setStatus(null)
            ->setAnswerDateTime(null)
            ->setAnswer(null)
            ->setPoints(0);

        return $this;
    }
}
