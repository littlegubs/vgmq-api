<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\Lobby;
use Lcobucci\JWT\Builder;
use Lcobucci\JWT\Signer\Key;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Symfony\Component\Mercure\Update;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mercure\PublisherInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class LobbyManager
{
    private PublisherInterface $publisher;
    private UrlGeneratorInterface $router;
    private EntityManagerInterface $entityManager;
    private SerializerInterface $serializer;

    public function __construct(
        PublisherInterface $publisher,
        UrlGeneratorInterface $router,
        EntityManagerInterface $entityManager,
        SerializerInterface $serializer
    ) {
        $this->publisher = $publisher;
        $this->router = $router;
        $this->entityManager = $entityManager;
        $this->serializer = $serializer;
    }

    public function update(Lobby $lobby): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'configUpdated'
        );
        $publisher($update);
    }

    public function userJoined(Lobby $lobby): void
    {
        $publisher = $this->publisher;
        $update = new Update(
            $this->router->generate('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL),
            $this->serializer->serialize($lobby->getLobbyUsers(), 'json', ['groups' => ['lobby_user']]),
            true,
            null,
            'updateLobbyUsers'
        );
        $publisher($update);
    }

    public function generateCode(): string
    {
        $str = str_split('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        do {
            $code = '';
            for ($i = 0; $i < 4; $i++) {
                $code .= $str[array_rand($str)];
            }
        } while (null !== $this->entityManager->getRepository(Lobby::class)->findOneBy(['code' => $code]));

        return $code;
    }

    public function createMercureAuthorizationToken(Lobby $lobby)
    {
        $token = (new Builder())
            ->withClaim('mercure', [
                'subscribe' => ["http://localhost/lobbies/yoyo"],
            ])
            ->getToken(new Sha256(), new Key('!ChangeMe!'));
    }
}
