<?php

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class Mp3MimeTypeValidator extends ConstraintValidator
{
    /**
     * @param UploadedFile $uploadedFile
     */
    public function validate($uploadedFile, Constraint $constraint)
    {

        if (!$constraint instanceof Mp3MimeType) {
            throw new UnexpectedTypeException($constraint, Mp3MimeType::class);
        }

        $fileInfo = (new \getID3())->analyze($uploadedFile->getRealPath());
        if (array_key_exists('error', $fileInfo)) {
            $this->context->buildViolation('The file '.$uploadedFile->getClientOriginalName().' is not a valid file')
                ->addViolation();
            return;
        }

        if (!in_array($fileInfo['mime_type'], ['audio/mpeg', 'audio/mp3'])) {
            $this->context->buildViolation('The mime type of the file '.$uploadedFile->getClientOriginalName().' ('.$fileInfo['mime_type'].') is invalid (allowed mime types: audio/mpeg, audio/mp3)')
                ->addViolation();
            return;
        }
    }
}
