<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\Lobby;
use App\Form\LobbyType;
use Lcobucci\JWT\Builder;
use App\Entity\LobbyUser;
use Lcobucci\JWT\Signer\Key;
use App\Message\LobbyMessage;
use App\Manager\LobbyManager;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use App\Controller\Traits\HandleErrorTrait;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

/**
 * @Route("/lobbies")
 */
class LobbyController extends AbstractController
{
    private SerializerInterface $serializer;
    private LobbyManager $lobbyManager;
    private string $mercureJwtKey;

    public function __construct(
        SerializerInterface $serializer,
        LobbyManager $lobbyManager,
        $mercureJwtKey
    ) {
        $this->serializer = $serializer;
        $this->lobbyManager = $lobbyManager;
        $this->mercureJwtKey = $mercureJwtKey;
    }

    use HandleErrorTrait;

    /**
     * @Route("/", name="lobby_list", methods={"GET"})
     */
    public function list()
    {
        return new JsonResponse();
    }

    /**
     * @Route("/create", name="lobby_create", methods={"POST"})
     */
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        $lobby = new Lobby();

        $form = $this->createForm(LobbyType::class, $lobby);
        $form->submit(json_decode($request->getContent(), true));

        if (!$form->isValid()) {
            return new JsonResponse(['errors' => $this->handleError($form)], 400);
        }

        try {
            $lobby->setCode($this->lobbyManager->generateCode());

            $lobbyUser = (new LobbyUser())
                ->setLobby($lobby)
                ->setUser($user)
                ->setRole(LobbyUser::TYPE_HOST);

            $em = $this->getDoctrine()->getManager();
            $em->persist($lobbyUser);
            $em->flush();
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse($this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]), 200, [], true);
    }

    /**
     * @Route("/{code}", name="lobby_update", methods={"PUT"})
     */
    public function update(string $code, Request $request): JsonResponse
    {
        $user = $this->getUser();
        $em = $this->getDoctrine()->getManager();

        $lobby = $em->getRepository(Lobby::class)->findOneBy(['code' => $code]);
        if (null === $lobby) {
            throw $this->createNotFoundException();
        }

        $lobbyUser = $em->getRepository(LobbyUser::class)->findOneBy([
            'lobby' => $lobby,
            'user' => $user,
            'role' => LobbyUser::TYPE_HOST,
        ]);
        if (null === $lobbyUser) {
            throw $this->createAccessDeniedException();
        }

        $form = $this->createForm(LobbyType::class, $lobby);
        $form->submit(json_decode($request->getContent(), true));
        if (!$form->isValid()) {
            return new JsonResponse(['errors' => $this->handleError($form)], 400);
        }

        try {
            $em->flush();
            $this->lobbyManager->update($lobby);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse($this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]), 200, [], true);
    }

    /**
     * @Route("/{code}/join", name="lobby_join", methods={"GET"})
     */
    public function join(Lobby $lobby, Request $request): JsonResponse
    {
        $user = $this->getUser();
        $em = $this->getDoctrine()->getManager();
        $lobbyUser = $em->getRepository(LobbyUser::class)->findOneBy([
            'lobby' => $lobby,
            'user' => $user,
            'role' => LobbyUser::TYPE_HOST,
        ]);

        if (null === $lobbyUser) {
            if (null !== $lobby->getPassword()) {
                if (null === $password = $request->request->get('password')) {
                    return new JsonResponse(null, 401);
                }

                if ($lobby->getPassword() !== $password) {
                    return new JsonResponse(null, 401);
                }
            }
            // TODO let the HttpClientEventSource handle active users when released in Symfony 5.2 (November 2020) or wait mercure to handle websub events (ETA end of 2020)
            /** @var User $user */
            $user = $this->getUser();

            try {
                $lobbyUser = (new LobbyUser())
                    ->setLobby($lobby)
                    ->setUser($user)
                    ->setRole(LobbyUser::TYPE_PLAYER);

                $em->persist($lobbyUser);
                $em->flush();
                $lobby->addLobbyUser($lobbyUser);

                $this->lobbyManager->userJoined($lobby);
            } catch (\Exception $exception) {
                return new JsonResponse('An error occured', 500);
            }
        }

        $response = new JsonResponse($this->serializer->serialize([
            'role' => $lobbyUser->getRole(),
            'lobby' => $lobby,
        ], 'json', ['groups' => ['lobby_user']]), 200, [], true);
        $this->setMercureCookie($lobby, $response);

        return $response;
    }

    /**
     * @Route("/{code}/spectate", name="lobby_spectate", methods={"GET", "POST"})
     */
    public function spectate(Lobby $lobby, Request $request): JsonResponse
    {
        if (null !== $lobby->getPassword()) {
            if (null === $password = $request->request->get('password')) {
                return new JsonResponse(null, 401);
            }

            if ($lobby->getPassword() !== $password) {
                return new JsonResponse(null, 401);
            }
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $lobbyUser = (new LobbyUser())
                ->setLobby($lobby)
                ->setUser($user)
                ->setRole(LobbyUser::TYPE_SPECTATOR);

            $em = $this->getDoctrine()->getManager();
            $em->persist($lobbyUser);
            $em->flush();
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        $response = new JsonResponse($this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]), 200, [], true);
        $this->setMercureCookie($lobby, $response);

        return $response;
    }

    /**
     * @Route("/tg", name="yoyo")
     */
    public function tg(MessageBusInterface $bus, Request $request)
    {
        $bus->dispatch(new LobbyMessage(1));

        return new JsonResponse('cool');
    }

    private function setMercureCookie(Lobby $lobby, Response $response): Response
    {
        $token = (new Builder())
            ->withClaim('mercure', [
                'publish' => [$this->generateUrl('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL)],
                'subscribe' => [$this->generateUrl('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL)],
            ])
            ->getToken(new Sha256(), new Key($this->mercureJwtKey));
        $response->headers->setCookie(
            new Cookie(
                'mercureAuthorization',
                $token, // cookie value
                time() + 14400, // expiration
                '/.well-known/mercure', // path
                null, // domain, null means that Symfony will generate it on its own.
                false, // secure
                true, // httpOnly
                false, // raw
                'strict'// same-site parameter, can be 'lax' or 'strict'.
            )
        );

        return $response;
    }
}
