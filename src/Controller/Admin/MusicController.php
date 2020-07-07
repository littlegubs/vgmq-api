<?php

namespace App\Controller\Admin;

use App\Entity\Music;
use App\Form\MusicType;
use App\Controller\Traits\HandleErrorTrait;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @Route("/musics")
 */
class MusicController extends AbstractController
{
    use HandleErrorTrait;

    /**
     * @Route("/{id}", name="admin_music_patch", methods={"PATCH"})
     */
    public function patch($id, Request $request, SerializerInterface $serializer): JsonResponse
    {
        $em = $this->getDoctrine()->getManager();
        $music = $em->getRepository(Music::class)->find($id);
        if (null === $music) {
            throw new NotFoundHttpException();
        }

        $form = $this->createForm(MusicType::class, $music);
        $form->submit(json_decode($request->getContent(), true));
        if ($form->isValid()) {
            try {
                $em->flush();

                return new JsonResponse($serializer->serialize($music, 'json', ['groups' => ['admin_music_patch']]), 200, [], true);
            } catch (\Exception $exception) {
                return new JsonResponse('An error occured', 500);
            }
        }

        return new JsonResponse(['errors' => $this->handleError($form)], 400);
    }
}
