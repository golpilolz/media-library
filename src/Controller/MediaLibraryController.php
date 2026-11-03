<?php

namespace Golpilolz\MediaLibrary\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Golpilolz\MediaLibrary\Dto\AddFolderPayload;
use Golpilolz\MediaLibrary\Dto\UploadPayload;
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
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Attribute\MapUploadedFile;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;

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
     * Creates a folder from the popup. JSON body `{"name": "…", "parent": <folder id, or 0/null for the root>}`,
     * see AddFolderPayload. An invalid body gets a 422 (400 if it isn't JSON).
     */
    #[Route('/folders', name: 'add_folder', methods: ['POST'])]
    public function addFolderAction(
        #[MapRequestPayload(acceptFormat: 'json')] AddFolderPayload $payload,
        FolderRepository $folderRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $parent = null;
        if (!in_array($payload->parent, [null, 0], true)) {
            $parent = $folderRepository->find($payload->parent);
            if (!$parent instanceof Folder) {
                return $this->uploadError('Unknown parent folder.');
            }
        }

        $folder = new Folder();
        $folder->setName($payload->name);
        $folder->setParent($parent);
        $entityManager->persist($folder);
        $entityManager->flush();

        return new JsonResponse(['result' => 'success', 'id' => $folder->getId()], Response::HTTP_CREATED);
    }

    /**
     * Receives a file dropped into the popup (multipart fields `file` and `folder`, see UploadPayload),
     * stores it in `upload_dir` and creates the File entity in that folder. A missing or failed
     * upload, or an invalid `folder` field, gets a 422 (400 when `folder` is missing).
     *
     * @param string[] $allowedExtensions
     */
    #[Route('/upload', name: 'upload', methods: ['POST'])]
    public function uploadAction(
        Request $request,
        #[MapUploadedFile(new Assert\File())] UploadedFile $file,
        #[MapRequestPayload(acceptFormat: 'form')] UploadPayload $payload,
        FolderRepository $folderRepository,
        EntityManagerInterface $entityManager,
        #[Autowire(param: 'golpilolz_medialibrary.upload_dir')] string $uploadDir,
        #[Autowire(param: 'golpilolz_medialibrary.upload_path')] string $uploadPath,
        #[Autowire(param: 'golpilolz_medialibrary.allowed_extensions')] array $allowedExtensions,
    ): JsonResponse {
        $folder = $folderRepository->find($payload->folder);
        if (!$folder instanceof Folder) {
            return $this->uploadError('Unknown folder.');
        }

        // The extension decides how the web server serves the file: only accept known ones.
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, array_map('strtolower', $allowedExtensions), true)) {
            return $this->uploadError(sprintf('Extension "%s" is not allowed.', $extension), Response::HTTP_UNSUPPORTED_MEDIA_TYPE);
        }

        $name = $file->getClientOriginalName();
        $basename = trim(preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo($name, PATHINFO_FILENAME)), '-') ?: 'file';
        $filename = $basename . '.' . $extension;
        for ($i = 1; file_exists($uploadDir . '/' . $filename); $i++) {
            $filename = $basename . '-' . $i . '.' . $extension;
        }

        try {
            $file->move($uploadDir, $filename);
        } catch (FileException $e) {
            return $this->uploadError($e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $media = new File();
        $media->setName($name);
        $media->setUrl(trim($uploadPath, '/') . '/' . $filename);
        $media->setFolder($folder);
        $entityManager->persist($media);
        $entityManager->flush();

        return new JsonResponse([
            'result' => 'success',
            'file' => [
                'id' => $media->getId(),
                'name' => $media->getName(),
                'url' => $this->publicUrl($request, $media),
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
