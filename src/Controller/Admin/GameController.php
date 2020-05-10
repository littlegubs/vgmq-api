<?php

namespace App\Controller\Admin;

use App\Entity\Game;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @Route("/games")
 */
class GameController extends AbstractController
{
    private NormalizerInterface $normalizer;
    private SerializerInterface $serializer;

    public function __construct(SerializerInterface $serializer, NormalizerInterface $normalizer)
    {
        $this->normalizer = $normalizer;
        $this->serializer = $serializer;
    }

    /**
     * @Route("/", name="admin_game_search", methods={"GET"})
     */
    public function search(Request $request)
    {
        $om = $this->getDoctrine()->getManager();

        $query = $request->get('query', '');
        $games = $om->getRepository(Game::class)->search($query);

        $data = [];
        $data['data'] = $this->normalizer->normalize($games, 'json', ['groups' => 'admin_game_search']);

        //TODO add total count

        return new JsonResponse($data);
    }

    /**
     * @Route("/{slug}", name="admin_game_get", methods={"GET"})
     */
    public function get($slug)
    {
        $om = $this->getDoctrine()->getManager();
        $game = $om->getRepository(Game::class)->findOneBy([
            'slug' => $slug,
        ]);
        if (null === $game) {
            throw new NotFoundHttpException();
        }

        return new JsonResponse($this->serializer->serialize($game,'json', ['groups' => 'admin_game_get'] ), 200, [], true);
    }
}
