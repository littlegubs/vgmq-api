<?php

namespace App\Controller;

use App\Manager\UserManager;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class UserController extends AbstractController
{
    private UserManager $userManager;

    public function __construct(UserManager $userManager)
    {
        $this->userManager = $userManager;
    }

    /**
     * @Route("/update-game-list", name="user_update_game_list", methods={"POST"})
     */
    public function updateGameList(Request $request)
    {
        $user = $this->getUser();

        $content = json_decode($request->getContent(), true);
        $igdbUsername = $content['igdbUsername'] ?? null;

        if (null === $igdbUsername) {
            return new JsonResponse(['errors' => [
                'username cannot be empty !',
            ]], 400);
        }

        try {

            $this->userManager->updateGameList($user, $igdbUsername);
            return new JsonResponse(null, 201);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occurred', 500);
        }
    }

}
