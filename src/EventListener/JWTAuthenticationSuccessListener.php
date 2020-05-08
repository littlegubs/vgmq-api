<?php

namespace App\EventListener;

use Exception;
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

    public function __construct(int $tokenLifetime)
    {
        $this->tokenLifetime = $tokenLifetime;
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
        $event->getResponse()->headers->setCookie(
            new Cookie(
                'vgmq-ut-hp', // Cookie name, should be the same as in config/packages/lexik_jwt_authentication.yaml.
                $token[0].'.'.$token[1], // cookie value
                time() + $this->tokenLifetime, // expiration
                '/', // path
                null, // domain, null means that Symfony will generate it on its own.
                false, // secure
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
                null, // domain, null means that Symfony will generate it on its own.
                false, // secure
                true, // httpOnly
                false, // raw
            // same-site parameter, can be 'lax' or 'strict'.
            )
        );
        $event->setData([]);
    }
}
