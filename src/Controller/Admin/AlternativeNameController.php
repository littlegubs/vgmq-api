<?php

namespace App\Controller\Admin;

use App\Entity\AlternativeName;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

/**
 * @Route("/alternative-names")
 */
class AlternativeNameController extends AbstractController
{

    /**
     * @Route("/{id}/toggle", name="admin_alternative_name_toggle", methods={"PATCH"})
     */
    public function toggle(AlternativeName $alternativeName): JsonResponse
    {
        $om = $this->getDoctrine()->getManager();
        try {
            $alternativeName->setEnabled(!$alternativeName->isEnabled());
            $om->persist($alternativeName);
            $om->flush();
        } catch (\Exception $exception) {
            return new JsonResponse('An error occured', 500);
        }

        return new JsonResponse(null, 201);
    }
}
