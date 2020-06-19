<?php

namespace App\EventListener;

use App\Entity\User;
use Symfony\Component\HttpFoundation\RequestStack;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

class JWTCreatedListener
{
    public function onJWTCreated(JWTCreatedEvent $event)
    {
        /** @var User $user */
        $user = $event->getUser();

        $payload = $event->getData();
        $payload['IGDBUsername'] = $user->getIgdbUsername();

        $event->setData($payload);
    }
}
