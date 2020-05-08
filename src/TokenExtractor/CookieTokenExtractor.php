<?php

namespace App\TokenExtractor;

use Symfony\Component\HttpFoundation\Request;
use Lexik\Bundle\JWTAuthenticationBundle\TokenExtractor\TokenExtractorInterface;

/**
 * CookieTokenExtractor.
 *
 * @author Nicolas Cabot <n.cabot@lexik.fr>
 */
class CookieTokenExtractor implements TokenExtractorInterface
{

    protected string $name;

    /**
     * @param string $name
     */
    public function __construct($name)
    {
        $this->name = $name;
    }

    /**
     * {@inheritdoc}
     */
    public function extract(Request $request)
    {
        $JWTHeaderPayload = $request->cookies->get($this->name.'-hp', false);
        $JWTSignature = $request->cookies->get($this->name.'-s', false);

        if (false !== $JWTHeaderPayload && false !== $JWTSignature) {
            return $JWTHeaderPayload.'.'.$JWTSignature;
        }

        return false;
    }
}
