<?php

namespace Golpilolz\MediaLibrary\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * JSON body of `POST /media-library/files/move`, mapped with #[MapRequestPayload].
 */
final class MoveFilePayload
{
    public function __construct(
        /** Id of the file to move. */
        #[Assert\Positive]
        public readonly int $file,
        /** Id of the target folder: a file can't live at the root. */
        #[Assert\Positive]
        public readonly int $folder,
    ) {
    }
}
