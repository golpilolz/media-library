<?php
namespace Golpilolz\MediaLibrary\Model;

interface FileInterface
{
    public function getId();

    public function getName();

    public function setName($name);

    public function getUrl();

    public function setUrl($url);

    public function getFolder();

    public function setFolder($folder);

    public function getBasename();
}