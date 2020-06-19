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
use Lexik\Bundle\JWTAuthenticationBundle\Security\Http\Authentication\AuthenticationSuccessHandler;

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
    public function updateGameList(
        Request $request,
        AuthenticationSuccessHandler $authenticationSuccessHandler
    ): JsonResponse {
        $user = $this->getUser();

        $content = json_decode($request->getContent(), true);
        $IGDBUsername = $content['IGDBUsername'] ?? null;

        if (null === $IGDBUsername) {
            return new JsonResponse(['errors' => [
                'IGDBUsername field missing !',
            ]], 400);
        }

        try {
            $this->userManager->updateGameList($user, $IGDBUsername);

            // send jwt cookie with updated payload
            return $authenticationSuccessHandler->handleAuthenticationSuccess($user);
        } catch (NotFoundHttpException $httpException) {
            return new JsonResponse("No 'played' IGDB list found with username '".$IGDBUsername."'", 404);
        } catch (IgdbApiLimitExceeded $exception) {
            return new JsonResponse('Syncing game list has been disabled, try again later !', 503);
        } catch (IgdbApiLimitExceededDuringProcess $exception) {
            return new JsonResponse('We lost connection with IGDB, some of your games may not have been synced', 503);
        } catch (IgdbApiBadStatusCode $exception) {
            return new JsonResponse('An error occurred', 502);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occurred', 500);
        }
    }

}
