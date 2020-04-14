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
     * @ORM\Column(type="string")
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


}
