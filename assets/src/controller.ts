'use strict';

import {Controller} from '@hotwired/stimulus';
import type {MediaFile, MediaFileInfo, MediaFolder, MenuItem, DialogButton} from './types.js'
import {LANG} from './lang.js'
import {byName, escapeHtml, EVENT_PREFIX, extension, fileMeta, iconFor, isImage, ROOT} from './utils.js'
import {fetchFileInfo, fetchJson, postJson, uploadFile} from './api.js'
import {labelForm, openDialog, readTitle} from './dialog.js'
import {closeContextMenu, openContextMenu} from './context-menu.js'
import {layoutTemplate, previewTemplate} from './templates.js'
import {infoTemplate} from './info.js'
import {createUploadZone, type UploadZone} from './upload.js'
import {CROP_TYPES, cropTemplate, cropToBlob, isCroppable, mountCropper, type Cropper} from './crop.js'

// The popup's Stimulus controller: state, rendering and actions. Markup and the
// self-contained pieces (dialogs, context menu, cropper, upload, HTTP calls) live in the sibling modules.
export default class extends Controller {
    static targets = ['input', 'popup', 'content', 'loader', 'preview', 'empty', 'filled', 'count']
    static values = {
        foldersUrl: String,
        uploadUrl: {type: String, default: ''},
        folderUrl: {type: String, default: ''},
        renameFileUrl: {type: String, default: ''},
        renameFolderUrl: {type: String, default: ''},
        moveFileUrl: {type: String, default: ''},
        deleteFileUrl: {type: String, default: ''},
        fileInfoUrl: {type: String, default: ''},
        csrfToken: {type: String, default: ''},
        multiple: {type: Boolean, default: false},
    }

    declare readonly inputTargets: HTMLInputElement[]
    declare readonly popupTarget: HTMLElement
    declare readonly contentTarget: HTMLElement
    declare readonly loaderTarget: HTMLElement
    declare readonly hasPreviewTarget: boolean
    declare readonly previewTarget: HTMLElement
    declare readonly emptyTargets: HTMLElement[]
    declare readonly filledTargets: HTMLElement[]
    declare readonly hasCountTarget: boolean
    declare readonly countTarget: HTMLElement
    declare readonly foldersUrlValue: string
    declare readonly uploadUrlValue: string
    declare readonly folderUrlValue: string
    declare readonly renameFileUrlValue: string
    declare readonly renameFolderUrlValue: string
    declare readonly moveFileUrlValue: string
    declare readonly deleteFileUrlValue: string
    declare readonly fileInfoUrlValue: string
    declare readonly csrfTokenValue: string
    declare readonly multipleValue: boolean

    private folders: MediaFolder[] = []
    private activeFolderId: number = ROOT
    private openFolderIds = new Set<number>()
    private selectedFileIds = new Set<number>()
    private highlightedFolderId: number | null = null
    private sortAsc = true
    private rendered = false
    private abort: AbortController | null = null
    private dropzone: UploadZone | null = null
    // Bumped by every open()/close(): an open() whose await resumes after a newer
    // open() or a close() must stop, or it would re-render or attach a second Dropzone.
    private session = 0

    connect() {
        this.toggleButtons()
        this.dispatchEvent('connect')
    }

    disconnect() {
        this.teardown()
    }

    // ---- Stimulus actions ------------------------------------------------

    async open() {
        const session = ++this.session
        this.popupTarget.classList.add('show')
        this.loaderTarget.hidden = false
        this.selectedFileIds = new Set(this.inputValues())

        if (!this.rendered) {
            this.contentTarget.innerHTML = layoutTemplate()
            this.bindEvents()
            this.rendered = true
        }

        let folders: MediaFolder[] | null = null
        try {
            folders = await fetchJson<MediaFolder[]>(this.foldersUrlValue)
        } catch (error) {
            console.error(error)
        }
        if (session !== this.session) {
            return
        }
        this.loaderTarget.hidden = true
        if (folders === null) {
            this.alert(LANG.errorAction, 'danger')
        } else {
            this.setFolders(folders)
        }

        this.render()
        await this.initDropzone(session)
        this.dispatchEvent('showPopup')
    }

    close() {
        this.session++
        this.popupTarget.classList.remove('show')
        this.closeContextMenu()
        this.destroyDropzone()
        this.dispatchEvent('closePopup')
    }

    clear() {
        this.writeValue([])
        this.dispatchEvent('clear')
    }

    // Multiple: remove one file from the selection (preview tile's × button).
    remove({params: {id}}: { params: { id: number } }) {
        this.writeInputs(this.inputValues().filter(value => value !== id))
        this.previewTarget.querySelector(`[data-${this.identifier}-id-param="${id}"]`)?.closest('.ml-preview-item')?.remove()
        this.toggleButtons()
        this.dispatchEvent('remove', {id})
    }

    // ---- Data ------------------------------------------------------------

    private setFolders(folders: MediaFolder[]) {
        this.folders = folders.map(folder => ({...folder, parent: folder.parent ?? ROOT, files: folder.files ?? []}))

        const active = this.folders.find(folder => folder.active)
        if (active) {
            this.activeFolderId = active.id
        } else if (!this.getFolder(this.activeFolderId)) {
            this.activeFolderId = ROOT
        }
        for (const folder of this.folders) {
            if (folder.open) {
                this.openFolderIds.add(folder.id)
            }
        }
        this.openAncestors(this.activeFolderId)
    }

    private getFolder(id: number | null): MediaFolder | undefined {
        return this.folders.find(folder => folder.id === id)
    }

    private getChildFolders(parent: number): MediaFolder[] {
        return this.folders.filter(folder => folder.parent === parent)
    }

    private getFile(id: number): MediaFile | undefined {
        for (const folder of this.folders) {
            const file = folder.files?.find(file => file.id === id)
            if (file) {
                return file
            }
        }
        return undefined
    }

    private getFileFolder(id: number): MediaFolder | undefined {
        return this.folders.find(folder => folder.files?.some(file => file.id === id))
    }

    private openAncestors(id: number) {
        let folder = this.getFolder(id)
        while (folder && folder.parent !== ROOT) {
            this.openFolderIds.add(folder.parent)
            folder = this.getFolder(folder.parent)
        }
    }

    // ---- Rendering -------------------------------------------------------

    private render() {
        this.renderTree()
        this.renderBreadcrumb()
        this.renderContent()
    }

    private renderBreadcrumb() {
        const path: MediaFolder[] = []
        let folder = this.getFolder(this.activeFolderId)
        while (folder) {
            path.unshift(folder)
            folder = this.getFolder(folder.parent)
        }
        const crumbs = [{id: ROOT, name: LANG.root}, ...path]
        this.find('.ml-breadcrumb').innerHTML = crumbs.map((crumb, index) => index === crumbs.length - 1
            ? `<span class="ml-crumb ml-crumb--current" aria-current="page">${escapeHtml(crumb.name)}</span>`
            : `<button type="button" class="ml-crumb" data-ml-action="navigate" data-folder-id="${crumb.id}">${escapeHtml(crumb.name)}</button><span class="ml-crumb-separator" aria-hidden="true">›</span>`).join('')
    }

    private updateFooter() {
        const count = this.selectedFileIds.size
        this.find('.ml-status').textContent = count === 0 ? LANG.noSelection : count === 1 ? LANG.oneSelected : LANG.manySelected(count)
        this.find<HTMLButtonElement>('[data-ml-action="validate"]').disabled = count === 0
    }

    private renderTree() {
        const tree = this.find('.ml-tree')
        const branch = (parent: number): string => {
            const children = this.getChildFolders(parent).sort(byName(true))
            if (children.length === 0) {
                return ''
            }
            return `<ul>${children.map(folder => {
                const hasChildren = this.getChildFolders(folder.id).length > 0
                const open = this.openFolderIds.has(folder.id)
                const classes = ['ml-tree-item', open ? 'open' : '', folder.id === this.activeFolderId ? 'active' : ''].join(' ')
                return `<li class="${classes}" data-folder-id="${folder.id}">
                    ${hasChildren ? `<button type="button" class="ml-expand" data-ml-action="toggle" aria-label="${open ? 'Replier' : 'Déplier'}" aria-expanded="${open}">›</button>` : '<span class="ml-expand"></span>'}
                    <span class="ml-tree-label" data-ml-action="navigate"><span class="${open ? 'icon-folder-open' : 'icon-folder'}"></span> ${escapeHtml(folder.name)}</span>
                    ${hasChildren ? branch(folder.id) : ''}
                </li>`
            }).join('')}</ul>`
        }

        tree.innerHTML = `<ul><li class="ml-tree-item open ${this.activeFolderId === ROOT ? 'active' : ''}" data-folder-id="${ROOT}">
            <span class="ml-expand"></span>
            <span class="ml-tree-label" data-ml-action="navigate"><span class="icon-folder-open"></span> ${LANG.root}</span>
            ${branch(ROOT)}
        </li></ul>`
    }

    private renderContent() {
        const content = this.find('.ml-content')
        const folders = this.getChildFolders(this.activeFolderId).sort(byName(this.sortAsc))
        const files = [...(this.getFolder(this.activeFolderId)?.files ?? [])].sort(byName(this.sortAsc))

        this.highlightedFolderId = null
        this.find<HTMLInputElement>('.ml-search').value = ''

        if (folders.length === 0 && files.length === 0) {
            content.innerHTML = `<div class="ml-empty">
                <span class="ml-empty-icon icon-folder-open" aria-hidden="true"></span>
                <p class="ml-empty-title">${LANG.emptyFolder}</p>
                ${this.uploadUrlValue !== '' && this.activeFolderId !== ROOT ? `<p class="ml-empty-hint">${LANG.emptyFolderUpload}</p>` : ''}
            </div>`
            this.updateFooter()
            return
        }

        content.innerHTML = folders.map(folder => `
            <div class="ml-item ml-folder" data-folder-id="${folder.id}" title="${escapeHtml(folder.name)}">
                <div class="ml-thumb ml-thumb--folder"><span class="icon-folder" aria-hidden="true"></span></div>
                <span class="ml-title">${escapeHtml(folder.name)}</span>
            </div>`).join('')
            + files.map(file => `
            <div class="ml-item ml-file ${this.selectedFileIds.has(file.id) ? 'active' : ''}" data-file-id="${file.id}" title="${escapeHtml(file.name)}">
                <div class="ml-thumb ml-thumb--${isImage(file) ? 'picture' : iconFor(file)}">
                    ${isImage(file) ? `<img src="${escapeHtml(file.url)}" alt="" loading="lazy">` : ''}
                </div>
                <span class="ml-title">${escapeHtml(file.name)}</span>
                ${fileMeta(file) ? `<span class="ml-meta">${escapeHtml(fileMeta(file))}</span>` : ''}
            </div>`).join('')
        this.updateFooter()
    }

    // ---- Events ----------------------------------------------------------

    private bindEvents() {
        this.abort = new AbortController()
        const signal = this.abort.signal
        const root = this.contentTarget

        root.addEventListener('click', event => this.onClick(event as MouseEvent), {signal})
        root.addEventListener('dblclick', event => this.onDblClick(event as MouseEvent), {signal})
        root.addEventListener('contextmenu', event => this.onContextMenu(event as MouseEvent), {signal})
        // Enter in the search box must not submit the surrounding Symfony form.
        root.addEventListener('keydown', event => {
            if (event.key === 'Enter' && (event.target as HTMLElement).matches('.ml-search')) {
                event.preventDefault()
            }
        }, {signal})
        root.addEventListener('input', event => {
            if ((event.target as HTMLElement).matches('.ml-search')) {
                this.filter((event.target as HTMLInputElement).value)
            }
        }, {signal})
        document.addEventListener('click', event => {
            if (!(event.target as HTMLElement).closest('.ml-context-menu')) {
                this.closeContextMenu()
            }
        }, {signal})
        document.addEventListener('keydown', event => this.onKeydown(event), {signal})
        this.find('.ml-content').addEventListener('scroll', () => this.closeContextMenu(), {signal})
        this.find('.ml-zoom').addEventListener('click', event => (event.currentTarget as HTMLDialogElement).close(), {signal})
    }

    private teardown() {
        this.session++
        this.abort?.abort()
        this.abort = null
        this.destroyDropzone()
        this.rendered = false
    }

    private onClick(event: MouseEvent) {
        const target = event.target as HTMLElement
        const action = target.closest<HTMLElement>('[data-ml-action]')?.dataset.mlAction
        const folderId = Number(target.closest<HTMLElement>('[data-folder-id]')?.dataset.folderId)

        switch (action) {
            case 'sort-asc':
            case 'sort-desc':
                this.sortAsc = action === 'sort-asc'
                this.findAll('[data-ml-action^="sort-"]').forEach(button =>
                    button.classList.toggle('active', button.dataset.mlAction === action))
                this.renderContent()
                return
            case 'open-folder':
                if (this.highlightedFolderId !== null) {
                    this.navigate(this.highlightedFolderId)
                }
                return
            case 'zoom':
                this.zoom()
                return
            case 'cancel':
                this.close()
                return
            case 'validate':
                this.select([...this.selectedFileIds])
                return
            case 'toggle':
                this.toggleFolder(folderId)
                return
            case 'navigate':
                this.navigate(folderId)
                return
        }

        if (!target.closest('.ml-content')) {
            return
        }

        const folder = target.closest<HTMLElement>('.ml-folder')
        const file = target.closest<HTMLElement>('.ml-file')

        if (folder) {
            this.highlight(folder)
            this.highlightedFolderId = Number(folder.dataset.folderId)
        } else if (file) {
            this.toggleFile(file)
        } else {
            this.findAll('.ml-content .ml-item.active').forEach(item => item.classList.remove('active'))
            this.highlightedFolderId = null
            this.selectedFileIds.clear()
        }
        this.updateFooter()
    }

    private onDblClick(event: MouseEvent) {
        const target = event.target as HTMLElement
        const folder = target.closest<HTMLElement>('.ml-content .ml-folder')
        const file = target.closest<HTMLElement>('.ml-content .ml-file')

        if (folder) {
            this.navigate(Number(folder.dataset.folderId))
        } else if (file && !this.multipleValue) {
            this.select([Number(file.dataset.fileId)])
        }
    }

    private onKeydown(event: KeyboardEvent) {
        if (event.key !== 'Escape' || !this.popupTarget.classList.contains('show')) {
            return
        }
        // Open <dialog>s handle Escape themselves.
        if (this.contentTarget.querySelector('dialog[open]')) {
            return
        }
        if (!this.find('.ml-context-menu').hidden) {
            this.closeContextMenu()
            return
        }
        this.close()
    }

    private highlight(item: HTMLElement) {
        this.findAll('.ml-content .ml-folder.active').forEach(other => other.classList.remove('active'))
        if (!this.multipleValue) {
            this.findAll('.ml-content .ml-item.active').forEach(other => other.classList.remove('active'))
            this.selectedFileIds.clear()
        }
        item.classList.add('active')
    }

    private toggleFile(item: HTMLElement) {
        const id = Number(item.dataset.fileId)
        if (this.multipleValue) {
            item.classList.toggle('active')
            item.classList.contains('active') ? this.selectedFileIds.add(id) : this.selectedFileIds.delete(id)
            return
        }
        this.highlight(item)
        this.highlightedFolderId = null
        this.selectedFileIds = new Set([id])
    }

    private navigate(id: number) {
        this.activeFolderId = id
        this.openAncestors(id)
        if (id !== ROOT) {
            this.openFolderIds.add(id)
        }
        this.render()
    }

    private toggleFolder(id: number) {
        this.openFolderIds.has(id) ? this.openFolderIds.delete(id) : this.openFolderIds.add(id)
        this.renderTree()
    }

    private filter(search: string) {
        const needle = search.trim().toLocaleUpperCase()
        this.findAll('.ml-content .ml-item').forEach(item => {
            const title = item.querySelector('.ml-title')?.textContent ?? ''
            item.hidden = needle !== '' && !title.toLocaleUpperCase().includes(needle)
        })
    }

    private zoom() {
        const id = [...this.selectedFileIds][0]
        const file = id === undefined ? undefined : this.getFile(id)
        if (!file || !isImage(file)) {
            return
        }
        const dialog = this.find<HTMLDialogElement>('.ml-zoom')
        dialog.querySelector('img').src = file.url
        dialog.showModal()
    }

    // ---- Selection / form value -----------------------------------------

    private select(ids: number[]) {
        const files = ids.map(id => this.getFile(id)).filter((file): file is MediaFile => file !== undefined)
        if (files.length === 0) {
            return
        }
        this.writeValue(files.map(file => file.id), files)
        this.dispatchEvent('select', {files})
        this.close()
    }

    private inputValues(): number[] {
        return this.inputTargets.map(input => input.value).filter(value => value !== '').map(Number)
    }

    private writeValue(ids: number[], files: MediaFile[] = []) {
        this.writeInputs(ids)
        if (this.hasPreviewTarget) {
            this.previewTarget.innerHTML = files.map(file => previewTemplate(file, this.multipleValue, this.identifier)).join('')
        }
        this.toggleButtons()
    }

    // Single: one hidden input. Multiple: one hidden input per id (name ends with []); an empty
    // multiple field disables its input so it submits nothing ('' would be an invalid choice).
    private writeInputs(ids: number[]) {
        const [first, ...extra] = this.inputTargets
        extra.forEach(input => input.remove())
        first.value = ids.length > 0 ? String(ids[0]) : ''
        first.disabled = this.multipleValue && ids.length === 0
        let previous = first
        for (const id of ids.slice(1)) {
            const input = first.cloneNode() as HTMLInputElement
            input.removeAttribute('id')
            input.value = String(id)
            previous.after(input)
            previous = input
        }
        first.dispatchEvent(new Event('change', {bubbles: true}))
    }

    private toggleButtons() {
        const filled = this.inputValues().length > 0
        this.emptyTargets.forEach(element => element.hidden = filled)
        this.filledTargets.forEach(element => element.hidden = !filled)
        if (this.hasCountTarget) {
            const count = this.inputValues().length
            this.countTarget.textContent = count > 1 ? `${count} fichiers` : '1 fichier'
        }
    }

    // ---- Context menu ----------------------------------------------------

    private onContextMenu(event: MouseEvent) {
        const target = event.target as HTMLElement
        if (!target.closest('.ml-content')) {
            return
        }
        event.preventDefault()

        const folderElement = target.closest<HTMLElement>('.ml-folder')
        const fileElement = target.closest<HTMLElement>('.ml-file')
        let items: MenuItem[]

        if (folderElement) {
            const folder = this.getFolder(Number(folderElement.dataset.folderId))
            items = [{label: LANG.rename, action: () => this.renameFolder(folder)}]
        } else if (fileElement) {
            const file = this.getFile(Number(fileElement.dataset.fileId))
            items = [
                {label: LANG.info, action: () => this.fileInfo(file)},
                {label: LANG.rename, action: () => this.renameFile(file)},
                ...(isCroppable(file) ? [{label: LANG.crop, action: () => this.cropFile(file)}] : []),
                {label: LANG.move, action: () => this.moveFile(file)},
                {label: LANG.delete, action: () => this.deleteFile(file)},
            ]
        } else {
            items = [{label: LANG.newFolder, action: () => this.addFolder()}]
        }

        openContextMenu(this.find('.ml-context-menu'), items, event.clientX, event.clientY)
    }

    private closeContextMenu() {
        closeContextMenu(this.contentTarget.querySelector<HTMLElement>('.ml-context-menu'))
    }

    // ---- Actions with dialogs -------------------------------------------
    //
    // Each action dispatches an event (e.g. "golpilolz_media-library:rename-file").
    // A listener can persist the change by calling event.detail.respondWith(promise):
    // the dialog waits for it and keeps the change local only once it resolves.

    private renameFile(file: MediaFile) {
        this.dialog(LANG.titleRenameFile, labelForm(file.name), [
            {label: LANG.cancel},
            {
                label: LANG.rename, className: 'ml-btn-primary', action: async dialog => {
                    const name = readTitle(dialog)
                    await this.persist('rename-file', {file, name}, this.renameFileUrlValue, {file: file.id, name}, LANG.errorRenameFile)
                    file.name = name
                    this.renderContent()
                    this.alert(LANG.successRenameFile)
                },
            },
        ])
    }

    private renameFolder(folder: MediaFolder) {
        this.dialog(LANG.titleRenameFolder, labelForm(folder.name), [
            {label: LANG.cancel},
            {
                label: LANG.rename, className: 'ml-btn-primary', action: async dialog => {
                    const name = readTitle(dialog)
                    await this.persist('rename-folder', {folder, name}, this.renameFolderUrlValue, {folder: folder.id, name}, LANG.errorRenameFolder)
                    folder.name = name
                    this.render()
                    this.alert(LANG.successRenameFolder)
                },
            },
        ])
    }

    private addFolder() {
        const parent = this.activeFolderId
        this.dialog(LANG.titleAddFolder, labelForm(), [
            {label: LANG.cancel},
            {
                label: LANG.add, className: 'ml-btn-primary', action: async dialog => {
                    const name = readTitle(dialog)
                    let response: { id?: number } | undefined
                    try {
                        response = await this.emit<{ id?: number }>('add-folder', {parent: this.getFolder(parent) ?? null, name})
                            ?? await this.createFolder(name, parent)
                    } catch (error) {
                        console.error(error)
                        throw new Error(LANG.errorAddFolder)
                    }
                    // Without a backend id, use a temporary negative one.
                    const id = response?.id ?? Math.min(0, ...this.folders.map(folder => folder.id)) - 1
                    this.folders.push({id, name, type: 'folder', parent, active: false, open: false, files: []})
                    this.render()
                },
            },
        ])
    }

    // Persist a folder with the folder_url endpoint, when no add-folder listener answered.
    private async createFolder(name: string, parent: number): Promise<{ id?: number } | undefined> {
        if (this.folderUrlValue === '') {
            return undefined
        }
        const json = await postJson(this.folderUrlValue, {name, parent}, this.csrfTokenValue)
        if (typeof json.id !== 'number') {
            throw new Error('The folder endpoint answered without an id')
        }
        return {id: json.id}
    }

    private moveFile(file: MediaFile) {
        const source = this.getFileFolder(file.id)
        const branch = (parent: number): string => {
            const children = this.getChildFolders(parent).sort(byName(true))
            return children.length === 0 ? '' : `<ul>${children.map(folder => `<li>
                <label class="ml-move-folder">
                    <input type="radio" name="target" value="${folder.id}" ${folder.id === source?.id ? 'disabled' : ''}>
                    <span class="icon-folder"></span> ${escapeHtml(folder.name)}
                </label>
                ${branch(folder.id)}
            </li>`).join('')}</ul>`
        }

        this.dialog(LANG.titleMoveFile, `<div class="ml-move-list">${branch(ROOT)}</div>`, [
            {label: LANG.cancel},
            {
                label: LANG.move, className: 'ml-btn-primary', action: async dialog => {
                    const checked = dialog.querySelector<HTMLInputElement>('[name="target"]:checked')
                    if (!checked) {
                        throw new Error(LANG.emptyTarget)
                    }
                    const target = this.getFolder(Number(checked.value))
                    await this.persist('move-file', {file, folder: target}, this.moveFileUrlValue, {file: file.id, folder: target.id}, LANG.errorMoveFile)
                    if (source) {
                        source.files = source.files.filter(other => other.id !== file.id)
                    }
                    target.files = [...(target.files ?? []), file]
                    this.renderContent()
                    this.alert(LANG.successMoveFile)
                },
            },
        ])
    }

    // Dispatch the event, then persist the change with the bundle endpoint `url` (POST JSON `body`)
    // when no listener answered. An empty url means the change only lives in the popup.
    // A listener's rejection is shown as is; an endpoint failure is logged and shown as `errorMessage`.
    private async persist(event: string, detail: object, url: string, body: object, errorMessage: string): Promise<void> {
        let answered = false
        await this.emit(event, detail, () => answered = true)
        if (answered || url === '') {
            return
        }
        try {
            await postJson(url, body, this.csrfTokenValue)
        } catch (error) {
            console.error(error)
            throw new Error(errorMessage)
        }
    }

    private deleteFile(file: MediaFile) {
        this.dialog(LANG.titleDeleteFile, `<p>${LANG.confirmDeleteFile} <strong>${escapeHtml(file.name)}</strong></p>`, [
            {label: LANG.cancel},
            {
                label: LANG.delete, className: 'ml-btn-danger', action: async () => {
                    await this.persist('delete-file', {file}, this.deleteFileUrlValue, {file: file.id}, LANG.errorDeleteFile)
                    const folder = this.getFileFolder(file.id)
                    if (folder) {
                        folder.files = folder.files.filter(other => other.id !== file.id)
                    }
                    this.selectedFileIds.delete(file.id)
                    this.renderContent()
                    this.alert(LANG.successDeleteFile)
                },
            },
        ])
    }

    // Show the file's details: what the popup knows right away, then what a file-info listener
    // (respondWith a promise of a partial MediaFileInfo) or the file_info endpoint answers.
    private async fileInfo(file: MediaFile) {
        const path: string[] = []
        for (let folder = this.getFileFolder(file.id); folder; folder = this.getFolder(folder.parent)) {
            path.unshift(folder.name)
        }
        const local: MediaFileInfo = {...file, path}

        this.dialog(LANG.titleFileInfo, infoTemplate(local, true), [{label: LANG.close, className: 'ml-btn-primary'}], 'ml-dialog--info')
        const dialog = this.find<HTMLDialogElement>('.ml-dialog')
        // Replaced when another dialog opens in the meantime: then the answer is dropped.
        const body = dialog.querySelector<HTMLElement>('.ml-dialog-body')

        let info: Partial<MediaFileInfo> | undefined
        let failed = false
        try {
            let answered = false
            info = await this.emit<Partial<MediaFileInfo>>('file-info', {file}, () => answered = true)
            if (!answered && this.fileInfoUrlValue !== '') {
                info = await fetchFileInfo(this.fileInfoUrlValue, file.id)
            }
        } catch (error) {
            console.error(error)
            failed = true
        }
        if (!body.isConnected || !dialog.open) {
            return
        }
        // The popup's name, folder and URL stay authoritative: they include unsaved local changes.
        body.innerHTML = infoTemplate({...local, ...info, name: local.name, url: local.url, path: local.path}, false)
        if (failed) {
            const error = dialog.querySelector<HTMLElement>('.ml-dialog-error')
            error.textContent = LANG.errorFileInfo
            error.hidden = false
        }
    }

    // Crop an image into a new file of the same folder: the original is kept. The canvas does
    // the cropping, then the result goes to the upload endpoint, unless a crop-file listener answers.
    private cropFile(file: MediaFile) {
        let cropper: Cropper
        this.dialog(LANG.titleCropFile, cropTemplate(file.url), [
            {label: LANG.cancel},
            {
                label: LANG.crop, className: 'ml-btn-primary', action: async () => {
                    const rect = cropper.crop()
                    if (!rect) {
                        throw new Error(LANG.errorCropLoad)
                    }
                    const folder = this.getFileFolder(file.id)
                    const ext = extension(file.url)
                    const name = LANG.croppedName(file.name.replace(/\.[^.]+$/, ''), ext)
                    let blob: Blob
                    try {
                        blob = await cropToBlob(cropper.image, rect, CROP_TYPES[ext])
                    } catch (error) {
                        console.error(error)
                        throw new Error(LANG.errorCropFile)
                    }
                    const cropped = await this.saveCrop({file, folder, crop: rect, blob, name})
                    folder.files = [...(folder.files ?? []), cropped]
                    if (!this.multipleValue) {
                        this.selectedFileIds.clear()
                    }
                    this.selectedFileIds.add(cropped.id)
                    this.renderContent()
                    this.alert(LANG.successCropFile)
                },
            },
        ], 'ml-dialog--crop')
        cropper = mountCropper(this.find<HTMLDialogElement>('.ml-dialog'))
    }

    // Store a cropped image as a new file of `detail.folder`: a crop-file listener can answer
    // with a promise of {id, name?, url}, otherwise it's POSTed to upload_url.
    private async saveCrop(detail: { file: MediaFile, folder: MediaFolder, crop: object, blob: Blob, name: string }): Promise<MediaFile> {
        let answered = false
        const response = await this.emit<Partial<MediaFile>>('crop-file', detail, () => answered = true)
        if (answered) {
            if (typeof response?.id !== 'number' || typeof response.url !== 'string') {
                console.error('crop-file: respondWith() must resolve with {id, url}', response)
                throw new Error(LANG.errorCropFile)
            }
            return {size: null, width: null, height: null, ...response, id: response.id, name: response.name ?? detail.name, url: response.url}
        }

        try {
            if (this.uploadUrlValue === '') {
                throw new Error('No upload_url and no crop-file listener')
            }
            return await uploadFile(this.uploadUrlValue, detail.blob, detail.name, detail.folder.id, this.csrfTokenValue)
        } catch (error) {
            console.error(error)
            throw new Error(LANG.errorCropFile)
        }
    }

    private dialog(title: string, body: string, buttons: DialogButton[], className = '') {
        openDialog(this.find<HTMLDialogElement>('.ml-dialog'), title, body, buttons, className)
    }

    // ---- Upload (Dropzone) ----------------------------------------------

    private async initDropzone(session: number) {
        if (this.uploadUrlValue === '' || this.dropzone) {
            return
        }
        this.dropzone = await createUploadZone({
            url: this.uploadUrlValue,
            csrfToken: this.csrfTokenValue,
            element: this.find('.ml-content'),
            previews: this.find('.ml-infos'),
            currentFolder: () => this.activeFolderId,
            isCurrent: () => session === this.session && !this.dropzone,
            onSending: (file, folder, xhr, formData) =>
                this.dispatchEvent('upload-sending', {file, folder: this.getFolder(folder) ?? null, xhr, formData}),
            onUploaded: (file, parent) => {
                const folder = this.getFolder(parent)
                if (folder) {
                    folder.files = [...(folder.files ?? []), file]
                    this.renderContent()
                }
                this.alert(LANG.successUploadFile)
            },
            onError: message => this.alert(message, 'danger'),
        }) ?? this.dropzone
    }

    private destroyDropzone() {
        this.dropzone?.destroy()
        this.dropzone = null
    }

    // ---- Helpers ---------------------------------------------------------

    private alert(message: string, type: 'success' | 'danger' = 'success') {
        const alert = document.createElement('div')
        alert.className = `ml-alert ml-alert--${type}`
        alert.setAttribute('role', 'status')
        alert.textContent = message
        this.find('.ml-alerts').append(alert)
        setTimeout(() => {
            alert.classList.add('out')
            setTimeout(() => alert.remove(), 300)
        }, 5000)
    }

    // Dispatch an event a listener can answer asynchronously with event.detail.respondWith(promise).
    // onRespond is called when a listener answers, to tell it apart from a promise resolving to undefined.
    private async emit<T = unknown>(name: string, detail: object, onRespond?: () => void): Promise<T | undefined> {
        let pending: Promise<T> | undefined
        this.dispatchEvent(name, {
            ...detail,
            respondWith: (promise: Promise<T>) => {
                pending = promise
                onRespond?.()
            },
        })
        return pending
    }

    private dispatchEvent(name: string, payload: object = {}) {
        this.dispatch(name, {detail: payload, prefix: EVENT_PREFIX})
    }

    private find<T extends HTMLElement = HTMLElement>(selector: string): T {
        return this.contentTarget.querySelector<T>(selector)
    }

    private findAll<T extends HTMLElement = HTMLElement>(selector: string): T[] {
        return [...this.contentTarget.querySelectorAll<T>(selector)]
    }
}
