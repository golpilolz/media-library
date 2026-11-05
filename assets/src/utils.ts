// Constants and pure helpers (no DOM state).

import type {MediaFile} from './types.js'

export const ROOT = 0
export const EVENT_PREFIX = 'golpilolz_media-library'
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp']
const ICONS: Record<string, string[]> = {
    pdf: ['pdf'],
    doc: ['doc', 'docx', 'odt', 'rtf'],
    xls: ['xls', 'xlsx', 'ods', 'csv'],
    zip: ['zip', 'rar', '7z', 'gz', 'tar'],
}

export const escapeHtml = (value: unknown): string => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const extension = (url: string): string => {
    const path = url.split(/[?#]/)[0]
    const dot = path.lastIndexOf('.')
    return dot === -1 ? '' : path.slice(dot + 1).toLowerCase()
}

export const isImage = (file: MediaFile): boolean => IMAGE_EXTENSIONS.includes(extension(file.url))

export const iconFor = (file: MediaFile): string => {
    const ext = extension(file.url)
    for (const [icon, extensions] of Object.entries(ICONS)) {
        if (extensions.includes(ext)) {
            return icon
        }
    }
    return 'txt'
}

export const byName = (asc: boolean) => (a: { name: string }, b: { name: string }): number =>
    (asc ? 1 : -1) * a.name.localeCompare(b.name, undefined, {sensitivity: 'base', numeric: true})

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)
