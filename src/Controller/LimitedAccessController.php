<?php

namespace App\Controller;

use Nette\Utils\Json;
use Swagger\Annotations as SWG;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * @Route("/limited-access")
 */
class LimitedAccessController
{
    private KernelInterface $kernel;

    public function __construct(KernelInterface $kernel)
    {
        $this->kernel = $kernel;
    }

    /**
     * @Route("/allowed", name="limited_access_allowed")
     */
    public function allowed(Request $request)
    {
        $limitedAccessCookie = $request->cookies->get('pote');

        return new JsonResponse(null !== $limitedAccessCookie);
    }

    /**
     * @Route("/password", name="limited_access_password")
     */
    public function limitedAccessPassword(Request $request)
    {
        $data = json_decode($request->getContent(), true);
        if (isset($data['password']) && $data['password'] === $_ENV['LIMITED_ACCESS_PASSWORD']) {

            $secure = true;
            $domain = 'videogamemusicquiz.com';
            if ('dev' === $this->kernel->getEnvironment()) {
                $secure = false;
                $domain = null;
            }

            $jsonResponse = new JsonResponse();
            $jsonResponse->headers->setCookie(Cookie::create('pote', 'pote', 0, '/', $domain, $secure, false));

            return $jsonResponse;
        }

        return new JsonResponse('Invalid password', 400);
    }
}
