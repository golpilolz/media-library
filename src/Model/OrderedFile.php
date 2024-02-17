<?php

namespace Golpilolz\MediaLibrary\Model;

use Doctrine\ORM\Mapping as ORM;

abstract class OrderedFile implements OrderedFileInterface
{
    const TYPE = 'ordered_file';

    /**
     * @var File
     */
    protected $file;

    /**
     * @var string
     *
     * @ORM\Column(name="position", type="integer")
     * @ORM\Id
     */
    protected $position;

    /**
     * @return mixed
     */
    public function getPosition()
    {
        return $this->position;
    }

    /**
     * @param $position
     * @return mixed
     */
    public function setPosition($position)
    {
        $this->position = $position;
        return $this;
    }

    /**
     * @return mixed
     */
    public function getFile()
    {
        return $this->file;
    }

    public function setFile(FileInterface $file)
    {
        $this->file = $file;
    }


}