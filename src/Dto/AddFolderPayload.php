<?php

namespace Golpilolz\MediaLibrary\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * JSON body of `POST /media-library/folders`, mapped with #[MapRequestPayload].
 */
final class AddFolderPayload
{
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public readonly string $name;

    public function __construct(
        string $name,
        /** Parent folder id, 0 or null for the root. */
        public readonly ?int $parent = null,
    ) {
        $this->name = trim($name);
    }
}
