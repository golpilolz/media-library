<?php

namespace Golpilolz\MediaLibrary\Form\Type;

use Golpilolz\MediaLibrary\Entity\File;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormView;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class GolpilolzMediaLibrarySingleType extends AbstractType
{
    protected $prefix;

    public function __construct(private readonly UrlGeneratorInterface $urlGenerator)
    {
        $this->prefix = 'test';
    }

    /**
     * {@inheritdoc}
     */
    public function buildView(FormView $view, FormInterface $form, array $options): void
    {
        $view->vars = array_replace($view->vars, [
            'prefix' => $this->prefix,
            'upload_url' => $options['upload_url'] ?? '',
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'prefix' => '',
            'class' => File::class,
            'choice_label' => 'name',
            // URL receiving Dropzone uploads (drag & drop into the library): the bundle's endpoint
            // by default. Upload is disabled when null.
            'upload_url' => $this->urlGenerator->generate('golpilolz_media-library_upload'),
        ]);
        $resolver->setAllowedTypes('prefix', ['string']);
        $resolver->setAllowedTypes('upload_url', ['null', 'string']);
    }

    public function getParent(): string
    {
        return EntityType::class;
    }
}
