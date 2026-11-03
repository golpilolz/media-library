<?php

namespace Golpilolz\MediaLibrary\Form\Type;

use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormView;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class GolpilolzMediaLibrarySingleType extends AbstractType
{
    protected $prefix;

    public function __construct()
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
            // URL receiving Dropzone uploads (drag & drop into the library). Upload is disabled when null.
            'upload_url' => null,
        ]);
        $resolver->setAllowedTypes('prefix', ['string']);
        $resolver->setAllowedTypes('upload_url', ['null', 'string']);
    }

    public function getParent(): string
    {
        return EntityType::class;
    }
}
