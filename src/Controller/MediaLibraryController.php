<?php

namespace Golpilolz\MediaLibrary\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Golpilolz\MediaLibrary\Entity\File;
use Golpilolz\MediaLibrary\Entity\Folder;
use Golpilolz\MediaLibrary\Repository\FolderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/media-library', name: 'golpilolz_media-library_')]
class MediaLibraryController extends AbstractController
{
    #[Route('/folders', name: 'folders', methods: ['GET'])]
    public function foldersAction(Request $request, FolderRepository $folderRepository): JsonResponse
    {
        $json = [];

        foreach ($folderRepository->findAll() as $folder) {
            $jsonFiles = [];

            foreach ($folder->getFiles() as $file) {
                $jsonFiles[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'url' => $this->publicUrl($request, $file),
                ];
            }

            $parent = $folder->getParent();

            $json[] = [
                'id' => $folder->getId(),
                'type' => 'folder',
                'name' => $folder->getName(),
                'parent' => $parent instanceof Folder ? $parent->getId() : $parent,
                'active' => false,
                'open' => false,
                'files' => $jsonFiles
            ];
        }

        return new JsonResponse($json);
    }

    /**
     * Receives a file dropped into the popup (multipart fields `file` and `folder`), stores it
     * in `upload_dir` and creates the File entity in that folder.
     *
     * @param string[] $allowedExtensions
     */
    #[Route('/upload', name: 'upload', methods: ['POST'])]
    public function uploadAction(
        Request $request,
        FolderRepository $folderRepository,
        EntityManagerInterface $entityManager,
        #[Autowire(param: 'golpilolz_medialibrary.upload_dir')] string $uploadDir,
        #[Autowire(param: 'golpilolz_medialibrary.upload_path')] string $uploadPath,
        #[Autowire(param: 'golpilolz_medialibrary.allowed_extensions')] array $allowedExtensions,
    ): JsonResponse {
        $upload = $request->files->get('file');
        if (!$upload instanceof UploadedFile || !$upload->isValid()) {
            return $this->uploadError($upload instanceof UploadedFile ? $upload->getErrorMessage() : 'No file uploaded.');
        }

        $folder = $folderRepository->find($request->request->getInt('folder'));
        if (!$folder instanceof Folder) {
            return $this->uploadError('Unknown folder.');
        }

        // The extension decides how the web server serves the file: only accept known ones.
        $extension = strtolower($upload->getClientOriginalExtension());
        if (!in_array($extension, array_map('strtolower', $allowedExtensions), true)) {
            return $this->uploadError(sprintf('Extension "%s" is not allowed.', $extension), Response::HTTP_UNSUPPORTED_MEDIA_TYPE);
        }

        $name = $upload->getClientOriginalName();
        $basename = trim(preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo($name, PATHINFO_FILENAME)), '-') ?: 'file';
        $filename = $basename . '.' . $extension;
        for ($i = 1; file_exists($uploadDir . '/' . $filename); $i++) {
            $filename = $basename . '-' . $i . '.' . $extension;
        }

        try {
            $upload->move($uploadDir, $filename);
        } catch (FileException $e) {
            return $this->uploadError($e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $file = new File();
        $file->setName($name);
        $file->setUrl(trim($uploadPath, '/') . '/' . $filename);
        $file->setFolder($folder);
        $entityManager->persist($file);
        $entityManager->flush();

        return new JsonResponse([
            'result' => 'success',
            'file' => [
                'id' => $file->getId(),
                'name' => $file->getName(),
                'url' => $this->publicUrl($request, $file),
                'parent' => $folder->getId(),
            ],
        ]);
    }

    private function publicUrl(Request $request, File $file): string
    {
        return $request->getSchemeAndHttpHost() . $request->getBasePath() . '/' . $file->getUrl();
    }

    private function uploadError(string $message, int $status = Response::HTTP_BAD_REQUEST): JsonResponse
    {
        return new JsonResponse(['result' => 'error', 'message' => $message], $status);
    }
}
