<?php

namespace App\MessageHandler;

use App\Message\LobbyMessage;
use App\Manager\LobbyManager;
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
        if ($lobbyMessage->getTask() === LobbyMessage::TASK_LOAD_MUSICS) {
            $this->lobbyManager->loadMusics($lobbyMessage->getLobbyCode());
        } else if ($lobbyMessage->getTask() === LobbyMessage::TASK_PLAY_MUSIC) {
            $this->lobbyManager->playMusic($lobbyMessage->getLobbyCode());
        } else if ($lobbyMessage->getTask() === LobbyMessage::TASK_REVEAL_ANSWER) {
            $this->lobbyManager->revealAnswer($lobbyMessage->getLobbyCode());
        } else if ($lobbyMessage->getTask() === LobbyMessage::TASK_UPDATE_LOBBY_USERS) {
            $this->lobbyManager->publishUpdateLobbyUsers($lobbyMessage->getLobbyCode());
        }
    }
}
