<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity()
 * @ORM\Table(name="games_musics")
 */
class GameMusic
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Game", inversedBy="musics")
     */
    private Game $game;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Music", inversedBy="games", cascade={"persist"})
     */
    private Music $music;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getGame(): ?Game
    {
        return $this->game;
    }

    public function setGame(Game $game): GameMusic
    {
        $this->game = $game;

        return $this;
    }

    public function getMusic(): ?Music
    {
        return $this->music;
    }

    public function setMusic(Music $music): GameMusic
    {
        $this->music = $music;

        return $this;
    }
}
