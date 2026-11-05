<?php

namespace Golpilolz\MediaLibrary\Controller;

use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Golpilolz\MediaLibrary\Dto\AddFolderPayload;
use Golpilolz\MediaLibrary\Dto\DeleteFilePayload;
use Golpilolz\MediaLibrary\Dto\MoveFilePayload;
use Golpilolz\MediaLibrary\Dto\RenameFilePayload;
use Golpilolz\MediaLibrary\Dto\RenameFolderPayload;
use Golpilolz\MediaLibrary\Dto\UploadPayload;
use Golpilolz\MediaLibrary\Entity\File;
use Golpilolz\MediaLibrary\Entity\Folder;
use Golpilolz\MediaLibrary\Repository\FileRepository;
use Golpilolz\MediaLibrary\Repository\FolderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Attribute\MapUploadedFile;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;

#[Route('/media-library', name: 'golpilolz_media-library_')]
class MediaLibraryController extends AbstractController
{
    /**
     * Every folder with its files, for the popup. A file's `size` (bytes) and, for an image, `width` and
     * `height` (pixels) are read from the stored file when its URL is under `upload_path`, null otherwise.
     */
    #[Route('/folders', name: 'folders', methods: ['GET'])]
    public function foldersAction(
        Request $request,
        FolderRepository $folderRepository,
        #[Autowire(param: 'golpilolz_medialibrary.upload_dir')] string $uploadDir,
        #[Autowire(param: 'golpilolz_medialibrary.upload_path')] string $uploadPath,
    ): JsonResponse {
        $json = [];

        foreach ($folderRepository->findAll() as $folder) {
            $jsonFiles = [];

            foreach ($folder->getFiles() as $file) {
                $jsonFiles[] = [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'url' => $this->publicUrl($request, $file),
                    ...$this->storedDetails($file, $uploadDir, $uploadPath),
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
     * Renames a folder from the popup. JSON body `{"folder": <folder id>, "name": "…"}`,
     * see RenameFolderPayload. An invalid body gets a 422 (400 if it isn't JSON).
     */
    #[Route('/folders/rename', name: 'rename_folder', methods: ['POST'])]
    public function renameFolderAction(
        #[MapRequestPayload(acceptFormat: 'json')] RenameFolderPayload $payload,
        FolderRepository $folderRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $folder = $folderRepository->find($payload->folder);
        if (!$folder instanceof Folder) {
            return $this->uploadError('Unknown folder.');
        }

        $folder->setName($payload->name);
        $entityManager->flush();

        return new JsonResponse(['result' => 'success']);
    }

    /**
     * Renames a file from the popup (its display name only, the stored file keeps its name).
     * JSON body `{"file": <file id>, "name": "…"}`, see RenameFilePayload. An invalid body gets a 422
     * (400 if it isn't JSON).
     */
    #[Route('/files/rename', name: 'rename_file', methods: ['POST'])]
    public function renameFileAction(
        #[MapRequestPayload(acceptFormat: 'json')] RenameFilePayload $payload,
        FileRepository $fileRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $file = $fileRepository->find($payload->file);
        if (!$file instanceof File) {
            return $this->uploadError('Unknown file.');
        }

        $file->setName($payload->name);
        $entityManager->flush();

        return new JsonResponse(['result' => 'success']);
    }

    /**
     * Moves a file to another folder from the popup. JSON body `{"file": <file id>, "folder": <folder id>}`,
     * see MoveFilePayload. An invalid body gets a 422 (400 if it isn't JSON).
     */
    #[Route('/files/move', name: 'move_file', methods: ['POST'])]
    public function moveFileAction(
        #[MapRequestPayload(acceptFormat: 'json')] MoveFilePayload $payload,
        FileRepository $fileRepository,
        FolderRepository $folderRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $file = $fileRepository->find($payload->file);
        if (!$file instanceof File) {
            return $this->uploadError('Unknown file.');
        }

        $folder = $folderRepository->find($payload->folder);
        if (!$folder instanceof Folder) {
            return $this->uploadError('Unknown folder.');
        }

        $file->setFolder($folder);
        $entityManager->flush();

        return new JsonResponse(['result' => 'success']);
    }

    /**
     * Details of one file for the popup's "Informations" dialog: `GET /media-library/files/info?file=<id>`.
     * Size, MIME type, modification date and image dimensions are read from the stored file when its URL
     * is under `upload_path` (null otherwise, or when it's missing). A missing or non-integer `file` gets a 404.
     */
    #[Route('/files/info', name: 'file_info', methods: ['GET'])]
    public function fileInfoAction(
        Request $request,
        #[MapQueryParameter(options: ['min_range' => 1])] int $file,
        FileRepository $fileRepository,
        #[Autowire(param: 'golpilolz_medialibrary.upload_dir')] string $uploadDir,
        #[Autowire(param: 'golpilolz_medialibrary.upload_path')] string $uploadPath,
    ): JsonResponse {
        $media = $fileRepository->find($file);
        if (!$media instanceof File) {
            return $this->uploadError('Unknown file.');
        }

        $folders = [];
        for ($folder = $media->getFolder(); $folder instanceof Folder; $folder = $folder->getParent()) {
            array_unshift($folders, $folder->getName());
        }

        $info = [
            'id' => $media->getId(),
            'name' => $media->getName(),
            'url' => $this->publicUrl($request, $media),
            'path' => $folders,
            'extension' => strtolower(pathinfo($media->getUrl(), PATHINFO_EXTENSION)),
            ...$this->storedDetails($media, $uploadDir, $uploadPath),
            'mimeType' => null,
            'modifiedAt' => null,
        ];

        $path = $this->storedPath($media, $uploadDir, $uploadPath);
        if ($path !== null && is_file($path)) {
            $modifiedAt = filemtime($path);
            $info['modifiedAt'] = $modifiedAt === false ? null : date(\DATE_ATOM, $modifiedAt);
            if (function_exists('mime_content_type')) {
                $info['mimeType'] = mime_content_type($path) ?: null;
            }
        }

        return new JsonResponse(['result' => 'success', 'file' => $info]);
    }

    /**
     * Deletes a file from the popup: the File entity, and the stored file when it lives in `upload_dir`.
     * JSON body `{"file": <file id>}`, see DeleteFilePayload. A file still referenced by another
     * entity gets a 409. An invalid body gets a 422 (400 if it isn't JSON).
     */
    #[Route('/files/delete', name: 'delete_file', methods: ['POST'])]
    public function deleteFileAction(
        #[MapRequestPayload(acceptFormat: 'json')] DeleteFilePayload $payload,
        FileRepository $fileRepository,
        EntityManagerInterface $entityManager,
        #[Autowire(param: 'golpilolz_medialibrary.upload_dir')] string $uploadDir,
        #[Autowire(param: 'golpilolz_medialibrary.upload_path')] string $uploadPath,
    ): JsonResponse {
        $file = $fileRepository->find($payload->file);
        if (!$file instanceof File) {
            return $this->uploadError('Unknown file.');
        }

        $url = $file->getUrl();
        $entityManager->remove($file);
        try {
            $entityManager->flush();
        } catch (ForeignKeyConstraintViolationException) {
            return $this->uploadError('File is in use.', Response::HTTP_CONFLICT);
        }

        // Only remove files the upload endpoint stored: a URL outside upload_path is left alone.
        $path = $this->storedPath($url, $uploadDir, $uploadPath);
        if ($path !== null && is_file($path)) {
            @unlink($path);
        }

        return new JsonResponse(['result' => 'success']);
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
                ...$this->storedDetails($media, $uploadDir, $uploadPath),
                'parent' => $folder->getId(),
            ],
        ]);
    }

    private function publicUrl(Request $request, File $file): string
    {
        return $request->getSchemeAndHttpHost() . $request->getBasePath() . '/' . $file->getUrl();
    }

    /**
     * Size in bytes and, for an image, dimensions in pixels of a stored file (see storedPath()).
     * Null when unknown: file outside `upload_path`, missing, or not an image for width/height.
     *
     * @return array{size: ?int, width: ?int, height: ?int}
     */
    private function storedDetails(File $file, string $uploadDir, string $uploadPath): array
    {
        $details = ['size' => null, 'width' => null, 'height' => null];
        $path = $this->storedPath($file, $uploadDir, $uploadPath);
        if ($path === null || !is_file($path)) {
            return $details;
        }

        $size = filesize($path);
        $details['size'] = $size === false ? null : $size;
        // Reads the image header only. SVGs and non-images return false.
        $image = @getimagesize($path);
        if ($image !== false && $image[0] > 0) {
            [$details['width'], $details['height']] = $image;
        }

        return $details;
    }

    /**
     * Local path of a file the upload endpoint stored (URL directly under `upload_path`), or null.
     */
    private function storedPath(File|string $file, string $uploadDir, string $uploadPath): ?string
    {
        $url = $file instanceof File ? $file->getUrl() : $file;
        $prefix = trim($uploadPath, '/') . '/';
        if (!str_starts_with($url, $prefix)) {
            return null;
        }
        $filename = substr($url, strlen($prefix));

        return $filename !== '' && $filename === basename($filename) ? $uploadDir . '/' . $filename : null;
    }

    private function uploadError(string $message, int $status = Response::HTTP_BAD_REQUEST): JsonResponse
    {
        return new JsonResponse(['result' => 'error', 'message' => $message], $status);
    }
}
