<?php

namespace App\Controller;

use App\Manager\UserManager;
use App\Exception\IgdbApiLimitExceeded;
use App\Exception\IgdbApiBadStatusCode;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use App\Exception\IgdbApiLimitExceededDuringProcess;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

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
        } catch (NotFoundHttpException $httpException) {
            return new JsonResponse("No 'played' IGDB list found with username '".$igdbUsername."'", 404);
        } catch (IgdbApiLimitExceeded $exception) {
            return new JsonResponse('Syncing game list has been disabled, try again later !', 500);
        } catch (IgdbApiLimitExceededDuringProcess $exception) {
            return new JsonResponse('We lost connection with IGDB, some of your games may not have been synced', 500);
        } catch (IgdbApiBadStatusCode $exception) {
            return new JsonResponse('An error occurred', 500);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occurred', 500);
        }
    }

}
