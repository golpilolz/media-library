'use strict';

import {Controller} from '@hotwired/stimulus';

interface MediaFile {
    id: number
    name: string
    url: string
}

interface MediaFolder {
    id: number
    name: string
    type?: string
    parent: number | null
    active?: boolean
    open?: boolean
    files?: MediaFile[]
}

interface DialogButton {
    label: string
    className?: string
    // Return false (or throw) to keep the dialog open.
    action?: (dialog: HTMLDialogElement) => void | boolean | Promise<void | boolean>
}

interface MenuItem {
    label: string
    action: () => void
}

const ROOT = 0
const EVENT_PREFIX = 'golpilolz_media-library'
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp']
const ICONS: Record<string, string[]> = {
    pdf: ['pdf'],
    doc: ['doc', 'docx', 'odt', 'rtf'],
    xls: ['xls', 'xlsx', 'ods', 'csv'],
    zip: ['zip', 'rar', '7z', 'gz', 'tar'],
}

const LANG = {
    title: 'Médiathèque',
    root: 'Accueil',
    select: 'Sélectionner',
    emptyFolder: 'Ce dossier est vide',
    emptyFolderUpload: 'Glissez des fichiers ici pour les ajouter.',
    noSelection: 'Aucun fichier sélectionné',
    oneSelected: '1 fichier sélectionné',
    manySelected: (count: number) => `${count} fichiers sélectionnés`,
    search: 'Rechercher un fichier',
    sortAsc: 'Trier de A à Z',
    sortDesc: 'Trier de Z à A',
    openFolder: 'Ouvrir le dossier',
    zoom: 'Agrandir',
    validate: 'Valider la sélection',
    label: 'Libellé',
    cancel: 'Annuler',
    rename: 'Renommer',
    move: 'Déplacer',
    delete: 'Supprimer',
    remove: 'Retirer',
    add: 'Ajouter',
    newFolder: 'Nouveau dossier',
    titleRenameFile: 'Renommer le fichier',
    titleRenameFolder: 'Renommer le dossier',
    titleAddFolder: 'Ajouter un dossier',
    titleMoveFile: 'Déplacer le fichier',
    titleDeleteFile: 'Supprimer le fichier ?',
    confirmDeleteFile: 'Êtes-vous sûr de vouloir supprimer le fichier :',
    emptyLabel: 'Veuillez entrer un libellé',
    emptyTarget: 'Veuillez choisir un dossier',
    errorAddFolder: 'Erreur lors de la création du dossier',
    errorRenameFile: 'Erreur lors du renommage du fichier',
    errorRenameFolder: 'Erreur lors du renommage du dossier',
    errorMoveFile: 'Erreur lors du déplacement du fichier',
    errorDeleteFile: 'Erreur lors de la suppression du fichier',
    errorAction: 'Une erreur est survenue',
    errorUpload: "Erreur lors de l'envoi du fichier",
    errorUploadRoot: 'Ouvrez un dossier pour y déposer des fichiers',
    successRenameFile: 'Le fichier a bien été renommé',
    successRenameFolder: 'Le dossier a bien été renommé',
    successUploadFile: 'Le fichier a bien été envoyé',
    successMoveFile: 'Le fichier a bien été déplacé',
    successDeleteFile: 'Le fichier a bien été supprimé',
}

const escapeHtml = (value: unknown): string => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const extension = (url: string): string => {
    const path = url.split(/[?#]/)[0]
    const dot = path.lastIndexOf('.')
    return dot === -1 ? '' : path.slice(dot + 1).toLowerCase()
}

const isImage = (file: MediaFile): boolean => IMAGE_EXTENSIONS.includes(extension(file.url))

const iconFor = (file: MediaFile): string => {
    const ext = extension(file.url)
    for (const [icon, extensions] of Object.entries(ICONS)) {
        if (extensions.includes(ext)) {
            return icon
        }
    }
    return 'txt'
}

const byName = (asc: boolean) => (a: { name: string }, b: { name: string }): number =>
    (asc ? 1 : -1) * a.name.localeCompare(b.name, undefined, {sensitivity: 'base', numeric: true})

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
    declare readonly multipleValue: boolean

    private folders: MediaFolder[] = []
    private activeFolderId: number = ROOT
    private openFolderIds = new Set<number>()
    private selectedFileIds = new Set<number>()
    private highlightedFolderId: number | null = null
    private sortAsc = true
    private rendered = false
    private abort: AbortController | null = null
    private dropzone: any = null
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
            this.contentTarget.innerHTML = this.layoutTemplate()
            this.bindEvents()
            this.rendered = true
        }

        let folders: MediaFolder[] | null = null
        try {
            folders = await this.fetchFolders()
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

    private async fetchFolders(): Promise<MediaFolder[]> {
        const response = await fetch(this.foldersUrlValue, {headers: {Accept: 'application/json'}})
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`)
        }
        return response.json()
    }

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

    private layoutTemplate(): string {
        const searchIcon = '<svg class="ml-search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

        return `
            <header class="ml-header">
                <h2 class="ml-heading">${LANG.title}</h2>
            </header>
            <div class="ml-toolbar">
                <nav class="ml-breadcrumb" aria-label="Chemin"></nav>
                <div class="ml-toolbar-actions">
                    <div class="ml-segmented" role="group" aria-label="Tri">
                        <button type="button" class="ml-segment active" data-ml-action="sort-asc" title="${LANG.sortAsc}" aria-label="${LANG.sortAsc}"><span class="icon-sort-alpha-asc"></span></button>
                        <button type="button" class="ml-segment" data-ml-action="sort-desc" title="${LANG.sortDesc}" aria-label="${LANG.sortDesc}"><span class="icon-sort-alpha-desc"></span></button>
                    </div>
                    <button type="button" class="ml-icon-btn" data-ml-action="open-folder" title="${LANG.openFolder}" aria-label="${LANG.openFolder}"><span class="icon-folder-open"></span></button>
                    <button type="button" class="ml-icon-btn" data-ml-action="zoom" title="${LANG.zoom}" aria-label="${LANG.zoom}"><span class="icon-zoom-in"></span></button>
                    <label class="ml-search-field">${searchIcon}
                        <input type="search" class="ml-search" placeholder="${LANG.search}" aria-label="${LANG.search}">
                    </label>
                </div>
            </div>
            <div class="ml-body">
                <nav class="ml-tree" aria-label="Dossiers"></nav>
                <div class="ml-content" tabindex="-1"></div>
            </div>
            <div class="ml-infos"></div>
            <footer class="ml-footer">
                <span class="ml-status" aria-live="polite"></span>
                <div class="ml-footer-actions">
                    <button type="button" class="ml-btn" data-ml-action="cancel">${LANG.cancel}</button>
                    <button type="button" class="ml-btn ml-btn-primary" data-ml-action="validate" disabled>${LANG.select}</button>
                </div>
            </footer>
            <div class="ml-alerts" aria-live="polite"></div>
            <div class="ml-context-menu" role="menu" hidden></div>
            <dialog class="ml-zoom"><img alt=""></dialog>
            <dialog class="ml-dialog"></dialog>`
    }

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
            this.previewTarget.innerHTML = files.map(file => this.previewTemplate(file)).join('')
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

    // Keep in sync with the widget template.
    private previewTemplate(file: MediaFile): string {
        const name = escapeHtml(file.name)
        return `<div class="ml-preview-item" title="${name}">
            <span class="ml-preview-thumb ml-thumb--${isImage(file) ? 'picture' : iconFor(file)}">${isImage(file) ? `<img src="${escapeHtml(file.url)}" alt="" loading="lazy">` : ''}</span>
            <span class="ml-preview-name">${name}</span>
            ${this.multipleValue ? `<button type="button" class="ml-preview-remove" data-action="${this.identifier}#remove" data-${this.identifier}-id-param="${file.id}" aria-label="${LANG.remove} ${name}" title="${LANG.remove}">
                <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>
            </button>` : ''}
        </div>`
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
                {label: LANG.rename, action: () => this.renameFile(file)},
                {label: LANG.move, action: () => this.moveFile(file)},
                {label: LANG.delete, action: () => this.deleteFile(file)},
            ]
        } else {
            items = [{label: LANG.newFolder, action: () => this.addFolder()}]
        }

        const menu = this.find('.ml-context-menu')
        menu.innerHTML = items.map((item, index) =>
            `<button type="button" role="menuitem" class="ml-context-item" data-index="${index}">${escapeHtml(item.label)}</button>`).join('')
        menu.querySelectorAll<HTMLButtonElement>('.ml-context-item').forEach(button => {
            button.addEventListener('click', () => {
                this.closeContextMenu()
                items[Number(button.dataset.index)].action()
            })
        })
        menu.hidden = false

        // Keep the menu inside the viewport.
        const {innerWidth, innerHeight} = window
        const {width, height} = menu.getBoundingClientRect()
        menu.style.left = `${Math.min(event.clientX, innerWidth - width - 4)}px`
        menu.style.top = `${Math.min(event.clientY, innerHeight - height - 4)}px`
        menu.querySelector<HTMLButtonElement>('button')?.focus()
    }

    private closeContextMenu() {
        const menu = this.contentTarget.querySelector<HTMLElement>('.ml-context-menu')
        if (menu) {
            menu.hidden = true
        }
    }

    // ---- Actions with dialogs -------------------------------------------
    //
    // Each action dispatches an event (e.g. "golpilolz_media-library:rename-file").
    // A listener can persist the change by calling event.detail.respondWith(promise):
    // the dialog waits for it and keeps the change local only once it resolves.

    private labelForm(value = ''): string {
        return `<label class="ml-label">${LANG.label}
            <input type="text" class="ml-input" name="title" value="${escapeHtml(value)}" required autofocus>
        </label>`
    }

    private readTitle(dialog: HTMLDialogElement): string {
        const title = dialog.querySelector<HTMLInputElement>('[name="title"]').value.trim()
        if (title === '') {
            throw new Error(LANG.emptyLabel)
        }
        return title
    }

    private renameFile(file: MediaFile) {
        this.dialog(LANG.titleRenameFile, this.labelForm(file.name), [
            {label: LANG.cancel},
            {
                label: LANG.rename, className: 'ml-btn-primary', action: async dialog => {
                    const name = this.readTitle(dialog)
                    await this.persist('rename-file', {file, name}, this.renameFileUrlValue, {file: file.id, name}, LANG.errorRenameFile)
                    file.name = name
                    this.renderContent()
                    this.alert(LANG.successRenameFile)
                },
            },
        ])
    }

    private renameFolder(folder: MediaFolder) {
        this.dialog(LANG.titleRenameFolder, this.labelForm(folder.name), [
            {label: LANG.cancel},
            {
                label: LANG.rename, className: 'ml-btn-primary', action: async dialog => {
                    const name = this.readTitle(dialog)
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
        this.dialog(LANG.titleAddFolder, this.labelForm(), [
            {label: LANG.cancel},
            {
                label: LANG.add, className: 'ml-btn-primary', action: async dialog => {
                    const name = this.readTitle(dialog)
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
        const response = await fetch(this.folderUrlValue, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Accept: 'application/json'},
            body: JSON.stringify({name, parent}),
        })
        const json = await response.json().catch(() => null)
        if (!response.ok || json?.result !== 'success' || typeof json.id !== 'number') {
            throw new Error(json?.message ?? `HTTP ${response.status}`)
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
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                body: JSON.stringify(body),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || json?.result !== 'success') {
                throw new Error(json?.message ?? `HTTP ${response.status}`)
            }
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

    private dialog(title: string, body: string, buttons: DialogButton[]) {
        // No <form> here: the widget usually sits inside the page's Symfony form, where a nested
        // <form> is dropped by the HTML parser. All buttons are type="button" for the same reason.
        const dialog = this.find<HTMLDialogElement>('.ml-dialog')
        dialog.innerHTML = `<div class="ml-dialog-form">
            <header class="ml-dialog-title">${escapeHtml(title)}</header>
            <div class="ml-dialog-body">${body}</div>
            <p class="ml-dialog-error" hidden></p>
            <footer class="ml-dialog-buttons">${buttons.map((button, index) =>
            `<button type="button" class="ml-btn ${button.className ?? ''}" data-index="${index}">${escapeHtml(button.label)}</button>`).join('')}
            </footer>
        </div>`

        const error = dialog.querySelector<HTMLElement>('.ml-dialog-error')
        const run = async (button: DialogButton, element: HTMLButtonElement) => {
            error.hidden = true
            element.disabled = true
            try {
                if (button.action && await button.action(dialog) === false) {
                    return
                }
                dialog.close()
            } catch (e) {
                error.textContent = e instanceof Error ? e.message : LANG.errorAction
                error.hidden = false
            } finally {
                element.disabled = false
            }
        }

        const elements = [...dialog.querySelectorAll<HTMLButtonElement>('.ml-dialog-buttons button')]
        elements.forEach(element => {
            element.addEventListener('click', () => run(buttons[Number(element.dataset.index)], element))
        })
        // Enter in an input triggers the last (primary) button.
        dialog.querySelector('.ml-dialog-body').addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.target as HTMLElement).matches('input')) {
                event.preventDefault()
                const primary = elements[elements.length - 1]
                if (!primary.disabled) {
                    run(buttons[buttons.length - 1], primary)
                }
            }
        })

        dialog.showModal()
    }

    // ---- Upload (Dropzone) ----------------------------------------------

    private async initDropzone(session: number) {
        if (this.uploadUrlValue === '' || this.dropzone) {
            return
        }

        const {default: Dropzone} = await import('dropzone')
        if (session !== this.session || this.dropzone) {
            return
        }

        let targetFolderId = this.activeFolderId
        const dropzone = new Dropzone(this.find('.ml-content'), {
            url: this.uploadUrlValue,
            previewsContainer: this.find('.ml-infos'),
            clickable: false,
            // Files belong to a folder: the root has none to store them in.
            accept: (file: File, done: (error?: string) => void) => done(targetFolderId === ROOT ? LANG.errorUploadRoot : undefined),
            resizeWidth: 1920,
            previewTemplate: `<div class="dz-preview dz-file-preview">
                <div class="dz-details"><img data-dz-thumbnail alt=""><span class="dz-filename" data-dz-name></span></div>
                <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
            </div>`,
        })

        dropzone.on('drop', (event: DragEvent) => {
            const folder = (event.target as HTMLElement).closest<HTMLElement>('.ml-folder')
            targetFolderId = folder ? Number(folder.dataset.folderId) : this.activeFolderId
        })
        dropzone.on('sending', (file: File, xhr: XMLHttpRequest, formData: FormData) => {
            formData.append('folder', String(targetFolderId))
            this.dispatchEvent('upload-sending', {file, folder: this.getFolder(targetFolderId) ?? null, xhr, formData})
        })
        dropzone.on('success', (file: File, json: any) => {
            if (json?.result !== 'success') {
                console.error(json)
                this.alert(LANG.errorUpload, 'danger')
                return
            }
            const folder = this.getFolder(json.file.parent)
            if (folder) {
                folder.files = [...(folder.files ?? []), {id: json.file.id, name: json.file.name, url: json.file.url}]
                this.renderContent()
            }
            this.alert(LANG.successUploadFile)
        })
        dropzone.on('error', (file: File, message: unknown) => {
            console.error(message)
            this.alert(message === LANG.errorUploadRoot ? LANG.errorUploadRoot : LANG.errorUpload, 'danger')
        })
        dropzone.on('complete', (file: any) => file.previewElement?.remove())

        this.dropzone = dropzone
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
