<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Class Cover
 *
 * @ORM\Entity()
 * @ORM\Table(name="lobbies_musics")
 */
class LobbyMusic
{

    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\Column(type="integer")
     */
    private int $position = 0;

    /**
     * @ORM\Column(type="integer")
     */
    private int $startAt = 0;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Lobby", inversedBy="musics")
     * @ORM\JoinColumn(onDelete="CASCADE")
     */
    private Lobby $lobby;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Music", inversedBy="lobbies")
     */
    private Music $music;

    /**
     * @ORM\OneToOne(targetEntity="App\Entity\Game")
     */
    private Game $expectedAnswer;

    /**
     * @return int
     */
    public function getId(): int
    {
        return $this->id;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;

        return $this;
    }

    public function getStartAt(): ?int
    {
        return $this->startAt;
    }

    public function setStartAt(int $startAt): self
    {
        $this->startAt = $startAt;

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

    public function getMusic(): Music
    {
        return $this->music;
    }

    public function setMusic(Music $music): self
    {
        $this->music = $music;

        return $this;
    }

    public function getExpectedAnswer(): Game
    {
        return $this->expectedAnswer;
    }

    public function setExpectedAnswer(Game $expectedAnswer): self
    {
        $this->expectedAnswer = $expectedAnswer;

        return $this;
    }
}
