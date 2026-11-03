<?php

namespace Golpilolz\MediaLibrary\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * JSON body of `POST /media-library/files/delete`, mapped with #[MapRequestPayload].
 */
final class DeleteFilePayload
{
    public function __construct(
        /** Id of the file to delete. */
        #[Assert\Positive]
        public readonly int $file,
    ) {
    }
}
