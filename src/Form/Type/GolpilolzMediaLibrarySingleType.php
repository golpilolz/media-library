<?php

namespace Golpilolz\MediaLibrary\Form\Type;

use Golpilolz\MediaLibrary\Entity\File;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormView;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\OptionsResolver\Options;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\OptionsResolver\Exception\InvalidOptionsException;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class GolpilolzMediaLibrarySingleType extends AbstractType
{
    protected $prefix;

    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $defaultTheme = 'default',
    ) {
        $this->prefix = 'test';
    }

    /**
     * {@inheritdoc}
     */
    public function buildView(FormView $view, FormInterface $form, array $options): void
    {
        $theme = $options['theme'];

        // Twig looks for "golpilolz_media_library_single_theme_<theme>_widget" before the base
        // widget block, so a form theme can override the widget markup for one theme only.
        // Inserted before the last prefix, which is the field's unique block prefix.
        $prefixes = $view->vars['block_prefixes'];
        array_splice($prefixes, -1, 0, ['golpilolz_media_library_single_theme_' . $theme]);

        $view->vars = array_replace($view->vars, [
            'prefix' => $this->prefix,
            'upload_url' => $options['upload_url'] ?? '',
            'theme' => $theme,
            'block_prefixes' => $prefixes,
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
            // Theme of the widget and popup: adds the "ml-theme-<theme>" class. Built-in themes:
            // "default", "sonata" (Sonata Admin) and "easyadmin" (EasyAdmin).
            'theme' => $this->defaultTheme,
        ]);
        $resolver->setAllowedTypes('prefix', ['string']);
        $resolver->setAllowedTypes('upload_url', ['null', 'string']);
        $resolver->setAllowedTypes('theme', ['string']);
        $resolver->setNormalizer('theme', static function (Options $options, string $theme): string {
            if (!preg_match('/^[a-z0-9_]+$/', $theme)) {
                throw new InvalidOptionsException(sprintf('The "theme" option "%s" must only contain lowercase letters, digits and underscores.', $theme));
            }

            return $theme;
        });
    }

    public function getParent(): string
    {
        return EntityType::class;
    }
}
