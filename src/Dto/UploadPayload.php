<?php

namespace Golpilolz\MediaLibrary\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Multipart fields of `POST /media-library/upload` other than the file, mapped with #[MapRequestPayload].
 */
final class UploadPayload
{
    public function __construct(
        /** Id of the folder that receives the file: uploads at the root are refused. */
        #[Assert\Positive]
        public readonly int $folder,
    ) {
    }
}
