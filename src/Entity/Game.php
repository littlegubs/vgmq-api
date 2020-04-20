<?php

namespace App\Entity;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Class Game
 * @ORM\Entity(repositoryClass="App\Repository\GameRepository")
 * @ORM\Table(name="games")
 */
class Game
{
    /**
     * @ORM\Id()
     * @ORM\GeneratedValue()
     * @ORM\Column(type="integer")
     */
    private int $id;

    /**
     * @var int
     * @ORM\Column(type="integer", unique=true)
     */
    private int $igdbId;

    /**
     * @var DateTime
     * @ORM\Column(type="date")
     */
    private DateTime $firstReleaseDate;

    /**
     * @var string
     * @ORM\Column(type="string")
     */
    private string $name;

    /**
     * @var string
     * @ORM\Column(type="string")
     */
    private string $slug;

    /**
     * @var string
     * @ORM\Column(type="string")
     */
    private string $url;

    /**
     * @var bool
     * @ORM\Column(type="boolean")
     */
    private bool $enabled = true;

    /**
     * @var AlternativeName[] | ArrayCollection
     * @ORM\OneToMany(targetEntity="AlternativeName", mappedBy="game", cascade={"persist", "remove"})
     */
    private Collection $alternativeNames;

    /**
     * @var Cover|null
     * @ORM\OneToOne(targetEntity="Cover", cascade={"persist", "remove"}, inversedBy="game")
     * @ORM\JoinColumn(onDelete="SET NULL")
     */
    private ?Cover $cover;

    /**
     * @var Video[] | ArrayCollection
     * @ORM\OneToMany(targetEntity="Video", mappedBy="game", cascade={"persist", "remove"})
     */
    private Collection $videos;

    /**
     * @var User[] | ArrayCollection
     * @ORM\ManyToMany(targetEntity="User", mappedBy="games")
     */
    private Collection $users;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Game", inversedBy="children")
     * @ORM\JoinColumn(onDelete="SET NULL")
     */
    private ?Game $parent;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\Game", mappedBy="parent")
     */
    private Collection $children;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\Game", inversedBy="childrenVersion")
     * @ORM\JoinColumn(onDelete="SET NULL")
     */
    private ?Game $parentVersion;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\Game", mappedBy="parentVersion")
     */
    private Collection $childrenVersion;

    public function __construct()
    {
        $this->alternativeNames = new ArrayCollection();
        $this->videos = new ArrayCollection();
        $this->users = new ArrayCollection();
        $this->children = new ArrayCollection();
        $this->childrenVersion = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(int $id): Game
    {
        $this->id = $id;

        return $this;
    }

    public function getIgdbId(): ?int
    {
        return $this->igdbId;
    }

    public function setIgdbId(int $igdbId): Game
    {
        $this->igdbId = $igdbId;

        return $this;
    }

    public function getFirstReleaseDate(): ?DateTime
    {
        return $this->firstReleaseDate;
    }

    public function setFirstReleaseDate(DateTime $firstReleaseDate): Game
    {
        $this->firstReleaseDate = $firstReleaseDate;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): Game
    {
        $this->name = $name;

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): Game
    {
        $this->slug = $slug;

        return $this;
    }

    public function isEnabled(): ?bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): Game
    {
        $this->enabled = $enabled;

        return $this;
    }

    public function getAlternativeNames(): Collection
    {
        return $this->alternativeNames;
    }

    public function setAlternativeNames(Collection $alternativeNames): Game
    {
        $this->alternativeNames = $alternativeNames;

        return $this;
    }

    public function getCover(): ?Cover
    {
        return $this->cover;
    }

    public function setCover(?Cover $cover): Game
    {
        $this->cover = $cover;

        return $this;
    }

    public function getVideos(): Collection
    {
        return $this->videos;
    }

    public function setVideos(Collection $videos): Game
    {
        $this->videos = $videos;

        return $this;
    }

    public function getUsers(): Collection
    {
        return $this->users;
    }

    public function setUsers(Collection $users): Game
    {
        $this->users = $users;

        return $this;
    }

    public function addUser(User $user): Game
    {
        if (!$this->users->contains($user)) {
            $this->users->add($user);
        }

        return $this;
    }

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(string $url): Game
    {
        $this->url = $url;

        return $this;
    }

    public function getParent(): ?Game
    {
        return $this->parent;
    }

    public function setParent(?Game $parent): Game
    {
        $this->parent = $parent;

        return $this;
    }

    public function getChildren(): Collection
    {
        return $this->children;
    }

    public function setChildren($children): Game
    {
        $this->children = $children;

        return $this;
    }

    public function getParentVersion(): ?Game
    {
        return $this->parentVersion;
    }

    public function setParentVersion(?Game $parentVersion): Game
    {
        $this->parentVersion = $parentVersion;

        return $this;
    }

    public function getChildrenVersion(): Collection
    {
        return $this->childrenVersion;
    }

    public function setChildrenVersion($childrenVersion): Game
    {
        $this->childrenVersion = $childrenVersion;

        return $this;
    }
}