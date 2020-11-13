<?php

namespace App\Message;

class LobbyMessage
{
    public const TASK_UPDATE_LOBBY_USERS = 'update_lobby_users';
    public const TASK_LOAD_MUSICS = 'load_musics';
    public const TASK_PLAY_MUSIC = 'play_music';
    public const TASK_REVEAL_ANSWER = 'reveal_answer';

    private string $lobbyCode;
    private string $task;

    public function __construct(string $lobbyCode, string $task)
    {
        $this->lobbyCode = $lobbyCode;
        $this->task = $task;
    }

    public function getLobbyCode(): string
    {
        return $this->lobbyCode;
    }

    public function getTask(): ?string
    {
        return $this->task;
    }
}
