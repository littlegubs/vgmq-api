<?php

namespace App\Controller\Admin;

use App\Entity\Game;
use App\Form\MusicFilesType;
use App\Form\MusicCsvType;
use App\Manager\MusicManager;
use App\Model\MusicUploadForm;
use Symfony\Component\Form\FormInterface;
use App\Controller\Traits\HandleErrorTrait;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

/**
 * @Route("/games")
 */
class GameController extends AbstractController
{
    use HandleErrorTrait;

    private NormalizerInterface $normalizer;
    private SerializerInterface $serializer;

    public function __construct(SerializerInterface $serializer, NormalizerInterface $normalizer)
    {
        $this->normalizer = $normalizer;
        $this->serializer = $serializer;
    }

    /**
     * @Route("", name="admin_game_search", methods={"GET"})
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

        return new JsonResponse($this->serializer->serialize($game, 'json', ['groups' => 'admin_game_get']), 200, [], true);
    }

    /**
     * @Route("/{slug}/musics/upload", name="admin_game_music_upload", methods={"POST"})
     */
    public function musicUpload(string $slug, Request $request, MusicManager $musicManager): JsonResponse
    {
        $om = $this->getDoctrine()->getManager();
        /** @var Game $game */
        $game = $om->getRepository(Game::class)->findOneBy([
            'slug' => $slug,
        ]);
        if (null === $game) {
            throw new NotFoundHttpException();
        }

        $form = $this->createForm(MusicFilesType::class);
        $form->handleRequest($request);
        if ($form->isSubmitted()) {
            if ($form->isValid()) {
                try {
                    $musicManager->uploadFiles($form['files']->getData(), $game);

                    return new JsonResponse($this->serializer->serialize($game, 'json', ['groups' => 'admin_game_get']), 201, [], true);
                } catch (\Exception $exception) {
                    return new JsonResponse('An error occured', 500);
                }
            } else {
                return new JsonResponse(['errors' => $this->handleError($form, true)], 400);
            }
        }

        return new JsonResponse(null, 400);
    }


}
