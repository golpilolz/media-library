<?php

namespace Golpilolz\MediaLibrary\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * JSON body of `POST /media-library/folders/rename`, mapped with #[MapRequestPayload].
 */
final class RenameFolderPayload
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public readonly string $name;

    public function __construct(
        /** Id of the folder to rename. */
        #[Assert\Positive]
        public readonly int $folder,
        string $name,
    ) {
        $this->name = trim($name);
    }
}
