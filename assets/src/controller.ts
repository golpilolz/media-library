'use strict';

import {Controller} from '@hotwired/stimulus';

export default class extends Controller {
    declare readonly inputTarget: HTMLInputElement
    declare readonly showPopupTarget: HTMLDivElement
    declare readonly popupTarget: HTMLDivElement
    declare readonly closePopupTarget: HTMLButtonElement
    declare readonly loaderTarget: HTMLDivElement
    declare readonly contentTarget: HTMLDivElement
    declare folders: Array<any>
    declare activeFolder: number;

    // static elements: Array<any> =  [['nav', 'search'], ['options'], ['tree', 'content', 'modalimg'], ['infos']]
    static elements: Array<any> = [['browse', 'search'], ['options'], ['tree', 'content'], ['infos']]
    static targets = ['select', 'showPopup', 'popup', 'closePopup', 'loader']
    static templates = {
        'nav': '',
        'browse': '<div id="browse" class="browse"><div class="btn-group" role="group"><button type="button" class="btn btn-default btn-sort asc active"><span class="icon-sort-alpha-asc"></span></button><button type="button" class="btn btn-default btn-sort desc"><span class="icon-sort-alpha-desc"></span></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default open-folder"><span class="icon-folder-open"></span></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default zoom-file"><span class="icon-zoom-in"></span></button></div></div>',
        'search': '<div id="search"><input type="text" class="form-control" id="search-input" placeholder="Rechercher un fichier"> </div>',
        'options': '<div id="options"></div>',
        'tree': '<div id="tree"></div>',
        'content': '<div id="content"></div>',
        'infos': '<div id="infos"></div>',
        'modalimg': '<div id="modal-zoom-img" class="modal"><img class="modal-content" id="modal-zoom-img-content"></div>',
        alert: '<div id="${Id}" class="alert alert-dismissable bbl-alert ${State}"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><p>${Content}</p></div>'
    }

    static templateFiles = {
        'default': {
            'folders': '<div class="folder"><span class="fa fa-folder"></span><span class="title" data-bbl-title></span></div>',
            'files': '<div class="file"><div data-bbl-img></div><span class="title" data-bbl-title></span></div>',
            'previewFile': '<div class="dz-preview dz-file-preview"><div class="dz-details"><img data-dz-thumbnail /><div class="dz-filename"><span data-dz-name></span></div></div><div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div></div>'
        }
    }

    connect() {
        this.activeFolder = 0;
        this.clear()
        this.showPopupTarget.addEventListener('click', (event) => this.onShowPopup(event))
        this.closePopupTarget.addEventListener('click', (event) => this.onClosePopup(event))
        this.dispatchEvent('connect')
    }

    clear() {
        /*this.inputTarget.value = '';
        this.inputTarget.style.display = 'block';
        this.placeholderTarget.style.display = 'block';
        this.previewTarget.style.display = 'none';
        this.previewImageTarget.style.display = 'none';
        this.previewImageTarget.style.backgroundImage = 'none';
        this.previewFilenameTarget.textContent = '';*/

        this.dispatchEvent('clear')
    }

    private getChildFolder(parent: number) {
        const child = [];
        for (const folder of this.folders) {
            if (folder.parent === parent)
                child.push(folder);
        }
        return child;
    }

    private getFiles(parent: number) {
        if (parent === 0) {
            return [];
        }
        const files = [];
        const folder = this.folders.find((folder) => folder.id === parent)
        if (folder === undefined) {
            return [];
        }

        return folder.files;
    }

    onShowPopup(event: Event) {
        this.popupTarget.classList.add('show')
        const url = this.popupTarget.dataset.folderUrl

        this.initInterface()

        fetch(url).then(response => response.json()).then(data => {
            this.loaderTarget.style.display = 'none'
            this.folders = data
            this.show()
        });
        this.dispatchEvent('showPopup')
    }

    onClosePopup(event: Event) {
        this.popupTarget.classList.remove('show')
        this.dispatchEvent('closePopup')
    }

    private initInterface() {
        for (const element of (this.constructor as any).elements) {
            let div = document.createElement('div')
            div.classList.add('content-div')
            for (const target of element) {
                div.innerHTML += (this.constructor as any).templates[target]
            }
            const contentBodies = this.popupTarget.getElementsByClassName('media-library-content')
            contentBodies.item(0).appendChild(div)
        }
    }

    private show() {
        this.drawTree()
        this.drawContent()
        this.dispatchEvent('show')
    }

    private drawTree() {
        const tree = document.getElementById('tree')
        let ul = document.createElement('ul')
        for (const folder of this.folders) {
            let li = document.createElement('li')
            li.innerHTML = `<li class="folder" data-folder-id="${folder.id}"><span class="icon-folder"></span>${folder.name}</li>`
            ul.appendChild(li)
        }
        tree.appendChild(ul)
    }

    private drawContent() {
        const content = document.getElementById('content')
        const folders = this.getChildFolder(this.activeFolder)

        let contentDiv = document.createElement('div')

        for (const folder of folders) {
            let div = document.createElement('div')
            div.innerHTML = `<div class="folder"><span class="icon-folder"></span>${folder.name}</div>`
            div.setAttribute('title', folder.name)
            div.setAttribute('id', folder.id)
            contentDiv.appendChild(div)
        }

        const files = this.getFiles(this.activeFolder)

        for (const file of files) {
            let div = document.createElement('div')
            div.innerHTML = `<div class="file"><div data-bbl-img></div><span class="title">${file.name}</span></div>`;
            div.setAttribute('title', file.name)
            div.setAttribute('id', file.id)
            contentDiv.appendChild(div)
        }

        content.appendChild(contentDiv)
    }

    private dispatchEvent(name: string, payload: any = {}) {
        this.dispatch(name, {detail: payload, prefix: 'golpilolz_media-library'});
    }
}