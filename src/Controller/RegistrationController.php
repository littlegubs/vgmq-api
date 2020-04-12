<?php

namespace App\Controller;

use App\Entity\User;
use DateInterval;
use DateTime;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Encoder\UserPasswordEncoderInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class RegistrationController extends AbstractController
{
    /**
     * @Route("/register", name="register", methods={"POST"})
     */
    public function register(
        Request $request,
        UserPasswordEncoderInterface $encoder,
        ValidatorInterface $validator,
        JWTTokenManagerInterface $JWTTokenManager,
        RefreshTokenManagerInterface $refreshTokenManager
    ) {
        $em = $this->getDoctrine()->getManager();

        $data = json_decode($request->getContent(), true);
        $username = $data['username'] ?? null;
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        try {
            $user = new User();
            $user
                ->setUsername($username)
                ->setEmail($email)
                ->setPlainPassword($password);

            $errors = $validator->validate($user);
            if (count($errors) > 0) {
                $responseData = [
                    'errors' => [],
                ];
                /** @var ConstraintViolation $error */
                foreach ($errors as $error) {
                    $responseData['errors'][] = [
                        'field' => $error->getPropertyPath(),
                        'message' => $error->getMessage(),
                    ];
                }

                return new JsonResponse($responseData, 400);
            }

            $user
                ->setPassword($encoder->encodePassword($user, $password))
                ->setRoles(['ROLE_USER'])
                ->setEnabled(true);

            $em->persist($user);
            $em->flush();

            $valid = new DateTime('now');
            $valid->add(new DateInterval('P1M'));
            $refreshToken = $refreshTokenManager->create();
            $refreshToken->setUsername($user->getUsername());
            $refreshToken->setRefreshToken();
            $refreshToken->setValid($valid);

            $refreshTokenManager->save($refreshToken);

            return new JsonResponse([
                'token' => $JWTTokenManager->create($user),
                'refresh_token' => $refreshToken->getRefreshToken(),
            ], 201);
        } catch (\Exception $exception) {
            return new JsonResponse('An error occurred', 500);
        }
    }

}
