<?php

namespace Golpilolz\MediaLibrary\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/media-library', name: 'golpilolz_media_library_')]
class MediaLibraryController extends AbstractController
{

    #[Route('/', name: 'index')]
    public function indexAction()
    {
        return $this->render('@GolpilolzMediaLibrary/index.html.twig');
//        return new Response("test");
    }
}
