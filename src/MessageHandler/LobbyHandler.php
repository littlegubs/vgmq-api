<?php

namespace App\MessageHandler;

use App\Message\LobbyMessage;
use App\Manager\LobbyManager;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Mercure\PublisherInterface;
use Symfony\Component\Messenger\Handler\MessageHandlerInterface;

class LobbyHandler implements MessageHandlerInterface
{
    private ?LobbyManager $lobbyManager;

    public function __construct(LobbyManager $lobbyManager)
    {
        $this->lobbyManager = $lobbyManager;
    }

    public function __invoke(LobbyMessage $lobbyMessage)
    {
//       $this->lobbyManager->sendUpdate();
    }
}
