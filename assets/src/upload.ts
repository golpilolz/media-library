// Upload into the file grid, by drag & drop or with the "Importer" button, with Dropzone 6 (imported only when an upload URL is set).

import type {MediaFile} from './types.js'
import {LANG} from './lang.js'
import {ROOT} from './utils.js'
import {CSRF_HEADER, toMediaFile} from './api.js'

export interface UploadZone {
    // Upload files picked with the "Importer" button into the current folder.
    addFiles(files: File[]): void
    destroy(): void
}

export interface UploadOptions {
    url: string
    // Sent as the X-CSRF-Token header; empty when CSRF protection is off.
    csrfToken: string
    // The grid that receives drops, and where the progress previews go.
    element: HTMLElement
    previews: HTMLElement
    // Folder shown in the grid: the target, unless the file is dropped onto a folder tile.
    currentFolder: () => number
    // Checked once Dropzone is loaded: false means the popup moved on, so nothing is attached.
    isCurrent: () => boolean
    onSending: (file: File, folder: number, xhr: XMLHttpRequest, formData: FormData) => void
    onUploaded: (file: MediaFile, folder: number) => void
    onError: (message: string) => void
}

export const createUploadZone = async (options: UploadOptions): Promise<UploadZone | null> => {
    const {default: Dropzone} = await import('dropzone')
    if (!options.isCurrent()) {
        return null
    }

    // Folder of the current drop. Each file keeps its own copy (folderOf), so a file still queued
    // from an earlier drop isn't sent to the folder of a later one.
    let targetFolderId = options.currentFolder()
    const folders = new WeakMap<File, number>()
    const folderOf = (file: File): number => folders.get(file) ?? targetFolderId
    const dropzone = new Dropzone(options.element, {
        url: options.url,
        headers: options.csrfToken === '' ? undefined : {[CSRF_HEADER]: options.csrfToken},
        previewsContainer: options.previews,
        clickable: false,
        // Files belong to a folder: the root has none to store them in.
        accept: (file: File, done: (error?: string) => void) => done(folderOf(file) === ROOT ? LANG.errorUploadRoot : undefined),
        // No resizeWidth/resizeHeight: Dropzone would re-encode every raster image through a canvas
        // (lossy JPEG, GIF/AVIF turned into PNG data under their own extension).
        previewTemplate: `<div class="dz-preview dz-file-preview">
            <div class="dz-details"><img data-dz-thumbnail alt=""><span class="dz-filename" data-dz-name></span></div>
            <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
        </div>`,
    })

    dropzone.on('drop', (event: DragEvent) => {
        const folder = (event.target as HTMLElement).closest<HTMLElement>('.ml-folder')
        targetFolderId = folder ? Number(folder.dataset.folderId) : options.currentFolder()
    })
    // Fired for each dropped file after 'drop' and before accept().
    dropzone.on('addedfile', (file: File) => folders.set(file, targetFolderId))
    dropzone.on('sending', (file: File, xhr: XMLHttpRequest, formData: FormData) => {
        formData.append('folder', String(folderOf(file)))
        options.onSending(file, folderOf(file), xhr, formData)
    })
    dropzone.on('success', (file: File, json: any) => {
        if (json?.result !== 'success') {
            console.error(json)
            options.onError(LANG.errorUpload)
            return
        }
        options.onUploaded(toMediaFile(json.file), json.file.parent)
    })
    dropzone.on('error', (file: File, message: unknown) => {
        console.error(message)
        options.onError(message === LANG.errorUploadRoot ? LANG.errorUploadRoot : LANG.errorUpload)
    })
    dropzone.on('complete', (file: any) => file.previewElement?.remove())

    return {
        addFiles: (files: File[]) => {
            targetFolderId = options.currentFolder()
            // addFile() fills in the DropzoneFile fields itself, as for its own file input.
            files.forEach(file => dropzone.addFile(file as any))
        },
        destroy: () => dropzone.destroy(),
    }
}
