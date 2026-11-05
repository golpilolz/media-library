// Shapes shared by the controller and its helper modules.

export interface MediaFile {
    id: number
    name: string
    url: string
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
