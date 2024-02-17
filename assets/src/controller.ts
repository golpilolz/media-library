'use strict';

import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    declare readonly inputTarget: HTMLInputElement
    declare readonly showPopupTarget: HTMLDivElement
    declare readonly popupTarget: HTMLDivElement
    declare readonly closePopupTarget: HTMLButtonElement
    declare readonly loaderTarget: HTMLDivElement
    declare folders: Array<any>

    static elements: Array<any> =  [['nav', 'search'], ['options'], ['tree', 'content', 'modalimg'], ['infos']]
    static targets = ['select', 'showPopup', 'popup', 'closePopup', 'loader']

    connect() {
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
        for (const element of default.elements) {

        }
    }

    private show() {
        this.draw()
    }

    private draw() {

    }

    private dispatchEvent(name: string, payload: any = {}) {
        this.dispatch(name, { detail: payload, prefix: 'golpilolz_media-library' });
    }
}