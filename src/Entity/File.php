<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Knp\DoctrineBehaviors\Model\Timestampable\TimestampableTrait;

/**
 * @ORM\Entity()
 * @ORM\Table(name="files")
 * @Gedmo\Uploadable(allowOverwrite=true, callback="callbackMethod", filenameGenerator="ALPHANUMERIC")
 */
class File
{
    use TimestampableTrait;

    /**
     * @ORM\Id()
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * Uploaded file info from $_FILES
     * Not mapped with Doctrine.
     *
     * @var array
     */
    private $file;

    /**
     * @ORM\Column(type="string", length=255)
     * @Gedmo\UploadableFilePath()
     */
    private $path;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $originalFilename;

    /**
     * @ORM\Column(type="string", length=10)
     */
    private $extension;

    /**
     * @ORM\Column(type="string", length=100)
     * @Gedmo\UploadableFileMimeType()
     */
    private $mimeType;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $token;

    /**
     * @ORM\Column(type="decimal")
     * @Gedmo\UploadableFileSize()
     */
    private $size;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $type;

    private $isPlaceholder;

    public function getId(): int
    {
        return $this->id;
    }

    public function getExtension(): string
    {
        return $this->extension;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function setMimeType(string $mimeType): self
    {
        $this->mimeType = $mimeType;

        return $this;
    }

    public function setOriginalFilename(string $originalFilename): self
    {
        $this->originalFilename = $originalFilename;

        return $this;
    }

    public function setExtension(string $extension): self
    {
        $this->extension = $extension;

        return $this;
    }

    public function getOriginalFilename(): string
    {
        return $this->originalFilename;
    }

    public function setSize(float $size): self
    {
        $this->size = $size;

        return $this;
    }

    public function getSize(): float
    {
        return $this->size;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;

        return $this;
    }

    public function setFile($file): self
    {
        $this->file = $file;

        return $this;
    }

    public function getFile()
    {
        return $this->file;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function setPath(string $path): self
    {
        $this->path = $path;

        return $this;
    }

    public function callbackMethod(array $file)
    {
        $this->originalFilename = $file['origFileName'];
        $this->extension = mb_substr($file['fileExtension'], 1);
    }

    public function isPlaceholder(): bool
    {
        return $this->isPlaceholder;
    }

    public function setPlaceholder(string $isPlaceholder)
    {
        $this->isPlaceholder = $isPlaceholder;

        return $this;
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function setToken(string $token): self
    {
        $this->token = $token;

        return $this;
    }
}
