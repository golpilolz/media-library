<?php

namespace Golpilolz\MediaLibrary\Controller;

use Golpilolz\MediaLibrary\Model\FileInterface;
use Golpilolz\MediaLibrary\Model\Folder;
use Golpilolz\MediaLibrary\Model\FolderInterface;
use Golpilolz\MediaLibrary\Model\FolderManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/media-library', name: 'golpilolz_media-library_')]
class MediaLibraryController extends AbstractController
{
    #[Route('/folders', name: 'folders')]
    public function foldersAction(Request $request, FolderManagerInterface $folderManager): JsonResponse
    {
        /** @var Folder[] $folders */
        $folders = $folderManager->findFolders();

        $json = [];
        $json[] = [
            'id' => 0,
            'type' => 'folder',
            'name' => 'Accueil',
            'parent' => null,
            'active'=> true,
            'open' => true
        ];

        foreach ($folders as $folder) {

            $jsonFiles = [];

            foreach ($folder->getFiles() as $file) {
                /** @var FileInterface $file */
                $jsonFiles[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'url' => $request->getScheme() . '://' . $request->getHttpHost() . $request->getBasePath() . '/' . $file->getUrl()
                ];
            }

            if($folder->getParent() instanceof FolderInterface){
                $parent = $folder->getParent()->getId();
            } else {
                $parent = $folder->getParent();
            }

            $json[] = [
                'id' => $folder->getId(),
                'type' => 'folder',
                'name' => $folder->getName(),
                'parent' => $parent,
                'active'=> false,
                'open' => false,
                'files' => $jsonFiles
            ];
        }

        return new JsonResponse($json);
    }
}
