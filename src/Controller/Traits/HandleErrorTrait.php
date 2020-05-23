<?php

namespace App\Controller\Traits;

use Symfony\Component\Form\FormInterface;

trait HandleErrorTrait
{
    public function handleError(FormInterface $form, bool $withoutFields = false)
    {
        $errors = [];
        foreach ($form->getErrors() as $error) {
            $errors[] = $error->getMessage();
        }
        foreach ($form->all() as $childForm) {
            if (($childForm instanceof FormInterface) && $childErrors = $this->handleError($childForm)) {
                if ($withoutFields) {
                    $errors[] = $childErrors;
                } else {
                    $errors[$childForm->getName()] = $childErrors;
                }
            }
        }

        return $errors;
    }
}
