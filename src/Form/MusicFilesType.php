<?php

namespace App\Form;

use App\Entity\Music;
use App\Model\MusicUploadForm;
use App\Validator\Constraints\Mp3MimeType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints\All;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\FileType;

class MusicFilesType extends AbstractType
{

    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $builder->add('files', FileType::class, [
            'constraints' => [
                new All([
                    new File([
                        'maxSize' => '50m',
                    ]),
                    new Mp3MimeType(),
                ]),

            ],
            'multiple' => true,
        ]);
    }

    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults([
            'csrf_protection' => false,
        ]);
    }

}
