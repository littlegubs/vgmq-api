<?php

namespace App\Client;

use App\Manager\IgdbApiStatusManager;
use App\Exception\IgdbApiBadStatusCode;
use App\Exception\IgdbApiLimitExceeded;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class IgdbClient
{
    private HttpClientInterface $client;
    private IgdbApiStatusManager $igdbApiStatusManager;
    private string $url = 'https://api-v3.igdb.com/';

    public function __construct(IgdbApiStatusManager $igdbApiStatusManager)
    {
        $this->igdbApiStatusManager = $igdbApiStatusManager;
        $this->client = HttpClient::create();
    }

    public function execute(string $route, $body = null, bool $checkApiStatus = true): array
    {
        $response = $this->client->request('GET', $this->url.$route, [
            'headers' => [
                'user-key' => $_ENV['IGDB_USER_KEY'],
                'Content-Type' => 'text/plain',
            ],
            'body' => $body,
        ]);

        if ($checkApiStatus) {
            $this->igdbApiStatusManager->addToCurrentValue();
        }

        $statusCode = $response->getStatusCode();
        if (200 !== $statusCode) {
            throw new IgdbApiBadStatusCode();
        }

        return $response->toArray();
    }
}
