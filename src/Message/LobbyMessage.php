<?php

namespace App\Message;

class LobbyMessage
{
    private int $lobbyId;

    public function __construct(int $lobbyId)
    {
        $this->lobbyId = $lobbyId;
    }

    public function getLobbyId(): int
    {
        return $this->lobbyId;
    }
}
