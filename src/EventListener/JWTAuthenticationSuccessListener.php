<?php

namespace App\EventListener;

use Exception;
use Symfony\Component\HttpKernel\KernelInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Class JWTAuthenticationSuccessListener
 *
 * @package App\EventListener
 */
class JWTAuthenticationSuccessListener
{

    private int $tokenLifetime;
    private KernelInterface $kernel;

    public function __construct(int $tokenLifetime, KernelInterface $kernel)
    {
        $this->tokenLifetime = $tokenLifetime;
        $this->kernel = $kernel;
    }

    /**
     * Sets JWT as a cookie on successful authentication.
     *
     * @param AuthenticationSuccessEvent $event
     *
     * @throws Exception
     */
    public function onAuthenticationSuccess(AuthenticationSuccessEvent $event): void
    {
        $token = explode('.', $event->getData()['token']);

        $secure = true;
        $domain = 'videogamemusicquiz.com';
        if ('dev' === $this->kernel->getEnvironment()) {
            $secure = false;
            $domain = null;
        }

        $event->getResponse()->headers->setCookie(
            new Cookie(
                'vgmq-ut-hp', // Cookie name, should be the same as in config/packages/lexik_jwt_authentication.yaml.
                $token[0].'.'.$token[1], // cookie value
                time() + $this->tokenLifetime, // expiration
                '/', // path
                $domain, // domain, null means that Symfony will generate it on its own.
                $secure, // secure
                false, // httpOnly
                false, // raw
            // same-site parameter, can be 'lax' or 'strict'.
            )
        );
        $event->getResponse()->headers->setCookie(
            new Cookie(
                'vgmq-ut-s', // Cookie name, should be the same as in config/packages/lexik_jwt_authentication.yaml.
                $token[2], // cookie value
                time() + $this->tokenLifetime, // expiration
                '/', // path
                $domain, // domain, null means that Symfony will generate it on its own.
                $secure, // secure
                true, // httpOnly
                false, // raw
            // same-site parameter, can be 'lax' or 'strict'.
            )
        );
    }
}
