<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\Lobby;
use App\Form\LobbyType;
use Lcobucci\JWT\Builder;
use App\Entity\LobbyUser;
use Lcobucci\JWT\Signer\Key;
use App\Manager\GameManager;
use Psr\Log\LoggerInterface;
use App\Message\LobbyMessage;
use App\Manager\LobbyManager;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use App\Controller\Traits\HandleErrorTrait;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpKernel\KernelInterface;
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
    private MessageBusInterface $bus;
    private KernelInterface $kernel;
    private string $mercureJwtKey;

    public function __construct(
        SerializerInterface $serializer,
        LobbyManager $lobbyManager,
        MessageBusInterface $bus,
        KernelInterface $kernel,
        $mercureJwtKey
    ) {
        $this->serializer = $serializer;
        $this->lobbyManager = $lobbyManager;
        $this->kernel = $kernel;
        $this->mercureJwtKey = $mercureJwtKey;
        $this->bus = $bus;
    }

    use HandleErrorTrait;

    /**
     * @Route("/", name="lobby_list", methods={"GET"})
     */
    public function list(): JsonResponse
    {
        $lobbies = $this->getDoctrine()->getRepository(Lobby::class)->findAll();

        return new JsonResponse($this->serializer->serialize($lobbies, 'json', ['groups' => ['lobby_user']]), 200, [], true);
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
                ->setRole(LobbyUser::ROLE_HOST);

            $em = $this->getDoctrine()->getManager();
            $em->persist($lobbyUser);
            $em->flush();
        } catch (\Exception $exception) {
            return new JsonResponse($exception->getMessage(), 500);
        }

        return new JsonResponse($this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]), 200, [], true);
    }

    /**
     * @Route("/{code}", name="lobby_update", methods={"PUT"}, schemes={"https"})
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
            'role' => LobbyUser::ROLE_HOST,
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
            $this->lobbyManager->publishUpdate($lobby);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse($this->serializer->serialize($lobby, 'json', ['groups' => ['lobby_user']]), 200, [], true);
    }

    /**
     * @Route("/{code}/join", name="lobby_join", methods={"GET", "POST"})
     */
    public function join(Lobby $lobby, Request $request, GameManager $gameManager, LoggerInterface $logger): JsonResponse
    {
        $user = $this->getUser();
        $em = $this->getDoctrine()->getManager();
        $lobbyUser = $em->getRepository(LobbyUser::class)->findOneBy([
            'lobby' => $lobby,
            'user' => $user,
        ]);

        if (null === $lobbyUser) {
            if (null !== $lobby->getPassword()) {
                if (null === $password = $request->request->get('password')) {
                    return new JsonResponse(null, 401);
                }

                if ($lobby->getPassword() !== $password) {
                    return new JsonResponse('Incorrect password', 401);
                }
            }
            // TODO let the HttpClientEventSource handle active users when released in Symfony 5.2 (November 2020) or wait mercure to handle websub events (ETA end of 2020)
            /** @var User $user */
            $user = $this->getUser();

            try {
                $lobbyUser = (new LobbyUser())
                    ->setLobby($lobby)
                    ->setUser($user)
                    ->setRole(LobbyUser::ROLE_PLAYER);

                $em->persist($lobbyUser);
                $em->flush();
                $lobby->addUser($lobbyUser);

                $this->lobbyManager->publishUpdateLobbyUsers($lobby);
            } catch (\Exception $exception) {
                return new JsonResponse('An error occured', 500);
            }
        }

        $response = new JsonResponse($this->serializer->serialize([
            'role' => $lobbyUser->getRole(),
            'lobby' => $lobby,
            'gameNames' => $gameManager->getAllNames(),
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
                return new JsonResponse('Incorrect password', 401);
            }
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $lobbyUser = (new LobbyUser())
                ->setLobby($lobby)
                ->setUser($user)
                ->setRole(LobbyUser::ROLE_SPECTATOR);

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
     * @Route("/{code}/play", name="lobby_play", methods={"GET"})
     */
    public function play(Lobby $lobby): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        $em = $this->getDoctrine()->getManager();
        $lobbyUser = $em->getRepository(LobbyUser::class)->findOneBy([
            'lobby' => $lobby,
            'user' => $user,
            'role' => LobbyUser::ROLE_HOST,
        ]);
        if (null === $lobbyUser) {
            throw $this->createAccessDeniedException();
        }

        try {
            $lobby->setStatus(Lobby::STATUS_LOADING);
            $em->flush();
            $this->lobbyManager->publishStatusUpdate($lobby);
            $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_LOAD_MUSICS));
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse();
    }

    /**
     * @Route("/{code}/answer", name="lobby_answer", methods={"POST"})
     */
    public function answer(string $code, Request $request): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        $em = $this->getDoctrine()->getManager();
        $lobby = $em->getRepository(Lobby::class)->findOneBy([
            'code' => $code,
            'status' => Lobby::STATUS_PLAYING_MUSIC,
        ]);
        if (null === $lobby) {
            throw $this->createNotFoundException();
        }
        $lobbyUser = $em->getRepository(LobbyUser::class)->getOnePlayerByLobbyAndUser($user, $lobby);
        if (null === $lobbyUser) {
            throw $this->createAccessDeniedException();
        }

        try {
            $lobbyUser
                ->setAnswer($request->request->get('answer'))
                ->setAnswerDateTime(new \DateTime());
            $em->flush();
            $this->bus->dispatch(new LobbyMessage($lobby->getCode(), LobbyMessage::TASK_UPDATE_LOBBY_USERS));
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse();
    }

    private function setMercureCookie(Lobby $lobby, Response $response): Response
    {
        $token = (new Builder())
            ->withClaim('mercure', [
                'subscribe' => [$this->generateUrl('lobby_update', ['code' => $lobby->getCode()], UrlGeneratorInterface::ABSOLUTE_URL)],
            ])
            ->getToken(new Sha256(), new Key($this->mercureJwtKey));

        $secure = true;
        $domain = 'videogamemusicquiz.com';
        $path = '/hub/.well-known/mercure';
        if ('dev' === $this->kernel->getEnvironment()) {
            $secure = false;
            $domain = null;
            $path = '/.well-known/mercure';
        }

        $response->headers->setCookie(Cookie::create('mercureAuthorization', $token, time() + 14400, $path, $domain, $secure));

        return $response;
    }
}
