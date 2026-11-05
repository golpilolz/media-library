<?php

namespace Golpilolz\MediaLibrary\Security;

use Golpilolz\MediaLibrary\Controller\MediaLibraryController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ControllerEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

/**
 * Guards every action of MediaLibraryController, before its arguments are resolved:
 * - safe methods (GET, HEAD) need `security.view_role`, the others `security.edit_role`
 *   (a null role skips the check);
 * - with `security.csrf_protection`, unsafe methods need the header `X-CSRF-Token` holding a valid
 *   token for the id CSRF_TOKEN_ID (rendered by the form widget).
 *
 * Checking on the controller class rather than on route names covers the endpoints whatever
 * the host app's route prefix or names are.
 */
final class EndpointAccessSubscriber implements EventSubscriberInterface
{
    public const CSRF_TOKEN_ID = 'golpilolz_media_library';
    public const CSRF_HEADER = 'X-CSRF-Token';

    public function __construct(
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        #[Autowire(param: 'golpilolz_medialibrary.security.view_role')] private readonly ?string $viewRole,
        #[Autowire(param: 'golpilolz_medialibrary.security.edit_role')] private readonly ?string $editRole,
        #[Autowire(param: 'golpilolz_medialibrary.security.csrf_protection')] private readonly bool $csrfProtection,
        // Null when framework.csrf_protection is disabled.
        private readonly ?CsrfTokenManagerInterface $csrfTokenManager = null,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::CONTROLLER => 'onKernelController'];
    }

    public function onKernelController(ControllerEvent $event): void
    {
        $controller = $event->getController();
        if (!\is_array($controller) || !$controller[0] instanceof MediaLibraryController) {
            return;
        }

        $request = $event->getRequest();
        $safe = $request->isMethodSafe();
        $role = $safe ? $this->viewRole : $this->editRole;

        if ($role !== null && !$this->authorizationChecker->isGranted($role)) {
            // Handled by the firewall: 401 / login redirect when anonymous, 403 otherwise.
            $exception = new AccessDeniedException('Access to the media library denied.');
            $exception->setAttributes([$role]);
            throw $exception;
        }

        if ($safe || !$this->csrfProtection) {
            return;
        }

        if ($this->csrfTokenManager === null) {
            throw new \LogicException('golpilolz_media_library.security.csrf_protection needs CSRF protection enabled in FrameworkBundle (framework.csrf_protection), or set it to false.');
        }

        $token = new CsrfToken(self::CSRF_TOKEN_ID, (string) $request->headers->get(self::CSRF_HEADER));
        if (!$this->csrfTokenManager->isTokenValid($token)) {
            throw new AccessDeniedHttpException('Invalid CSRF token.');
        }
    }
}
