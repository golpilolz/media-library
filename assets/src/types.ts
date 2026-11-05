// Shapes shared by the controller and its helper modules.

export interface MediaFile {
    id: number
    name: string
    url: string
    // Bytes and pixels, from the bundle's endpoints: null/absent when unknown (or not an image).
    size?: number | null
    width?: number | null
    height?: number | null
}

export interface MediaFolder {
    id: number
    name: string
    type?: string
    parent: number | null
    active?: boolean
    open?: boolean
    files?: MediaFile[]
}

// The "Informations" dialog's data: from the file_info endpoint or a file-info listener.
// Every field but those of MediaFile is optional (null/absent = unknown).
export interface MediaFileInfo extends MediaFile {
    path?: string[]
    extension?: string | null
    mimeType?: string | null
    modifiedAt?: string | null
}

export interface DialogButton {
    label: string
    className?: string
    // Return false (or throw) to keep the dialog open.
    action?: (dialog: HTMLDialogElement) => void | boolean | Promise<void | boolean>
}

export interface CropRect {
    x: number
    y: number
    width: number
    height: number
}

export interface MenuItem {
    label: string
    action: () => void
}
