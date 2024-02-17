<?php

namespace Golpilolz\MediaLibrary\Model;

interface OrderedFileInterface{
    public function getPosition();

    public function setPosition($position);

    public function getFile();

    public function setFile(FileInterface $file);
}