<?php

namespace Golpilolz\MediaLibrary\Controller;

use Golpilolz\MediaLibrary\Model\FolderInterface;
use Golpilolz\MediaLibrary\Repository\FolderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/media-library', name: 'golpilolz_media-library_')]
class MediaLibraryController extends AbstractController
{
    #[Route('/folders', name: 'folders')]
    public function foldersAction(Request $request, FolderRepository $folderRepository): JsonResponse
    {
        $json = [];

        foreach ($folderRepository->findAll() as $folder) {
            $jsonFiles = [];

            foreach ($folder->getFiles() as $file) {
                $jsonFiles[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'url' => $request->getScheme() . '://' . $request->getHttpHost() . $request->getBasePath() . '/' . $file->getUrl()
                ];
            }

            $parent = $folder->getParent();

            $json[] = [
                'id' => $folder->getId(),
                'type' => 'folder',
                'name' => $folder->getName(),
                'parent' => $parent instanceof FolderInterface ? $parent->getId() : $parent,
                'active' => false,
                'open' => false,
                'files' => $jsonFiles
            ];
        }

        return new JsonResponse($json);
    }
}
