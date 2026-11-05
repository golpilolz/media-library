<?php

namespace Golpilolz\MediaLibrary\Form\Type;

use Golpilolz\MediaLibrary\Entity\File;
use Golpilolz\MediaLibrary\Security\EndpointAccessSubscriber;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormView;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\OptionsResolver\Options;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\OptionsResolver\Exception\InvalidOptionsException;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

class GolpilolzMediaLibrarySingleType extends AbstractType
{
    protected $prefix;

    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $defaultTheme = 'default',
        private readonly bool $csrfProtection = true,
        private readonly ?CsrfTokenManagerInterface $csrfTokenManager = null,
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
            'folder_url' => $options['folder_url'] ?? '',
            'rename_file_url' => $options['rename_file_url'] ?? '',
            'rename_folder_url' => $options['rename_folder_url'] ?? '',
            'move_file_url' => $options['move_file_url'] ?? '',
            'delete_file_url' => $options['delete_file_url'] ?? '',
            'file_info_url' => $options['file_info_url'] ?? '',
            // Sent as X-CSRF-Token by the popup's write requests (see EndpointAccessSubscriber).
            'media_csrf_token' => $this->csrfProtection && $this->csrfTokenManager !== null
                ? $this->csrfTokenManager->getToken(EndpointAccessSubscriber::CSRF_TOKEN_ID)->getValue()
                : '',
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
            // URL receiving folder creation (POST JSON {name, parent}, responds {id}): the bundle's
            // endpoint by default. When null, only an "add-folder" event listener can persist folders.
            'folder_url' => $this->urlGenerator->generate('golpilolz_media-library_add_folder'),
            // URLs receiving renames (POST JSON {file|folder, name}), moves (POST JSON {file, folder})
            // and deletions (POST JSON {file}): the bundle's endpoints by default. When null, only the
            // matching event listener ("rename-file", "rename-folder", "move-file", "delete-file")
            // can persist the change.
            'rename_file_url' => $this->urlGenerator->generate('golpilolz_media-library_rename_file'),
            'rename_folder_url' => $this->urlGenerator->generate('golpilolz_media-library_rename_folder'),
            'move_file_url' => $this->urlGenerator->generate('golpilolz_media-library_move_file'),
            'delete_file_url' => $this->urlGenerator->generate('golpilolz_media-library_delete_file'),
            // URL answering the "Informations" dialog (GET ?file=<id>, responds {file: {…}}): the bundle's
            // endpoint by default. When null, a "file-info" listener can answer, otherwise the dialog only
            // shows what the popup already knows (name, folder, URL).
            'file_info_url' => $this->urlGenerator->generate('golpilolz_media-library_file_info'),
            // Theme of the widget and popup: adds the "ml-theme-<theme>" class. Built-in themes:
            // "default", "sonata" (Sonata Admin) and "easyadmin" (EasyAdmin).
            'theme' => $this->defaultTheme,
        ]);
        $resolver->setAllowedTypes('prefix', ['string']);
        $resolver->setAllowedTypes('upload_url', ['null', 'string']);
        $resolver->setAllowedTypes('folder_url', ['null', 'string']);
        $resolver->setAllowedTypes('rename_file_url', ['null', 'string']);
        $resolver->setAllowedTypes('rename_folder_url', ['null', 'string']);
        $resolver->setAllowedTypes('move_file_url', ['null', 'string']);
        $resolver->setAllowedTypes('delete_file_url', ['null', 'string']);
        $resolver->setAllowedTypes('file_info_url', ['null', 'string']);
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
