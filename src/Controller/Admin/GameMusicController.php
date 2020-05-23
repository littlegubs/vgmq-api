<?php

namespace App\Controller\Admin;

use App\Entity\Music;
use App\Form\MusicType;
use App\Entity\GameMusic;
use App\Controller\Traits\HandleErrorTrait;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @Route("/games-musics")
 */
class GameMusicController extends AbstractController
{
    use HandleErrorTrait;

    /**
     * @Route("/{id}", name="admin_music_delete", methods={"DELETE"})
     */
    public function delete($id): JsonResponse
    {
        $om = $this->getDoctrine()->getManager();
        $gameMusic = $om->getRepository(GameMusic::class)->find($id);
        if (null === $gameMusic) {
            throw new NotFoundHttpException();
        }

        try {
            $om->remove($gameMusic);
            $om->flush();

            return new JsonResponse();
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }
    }
}
