// Constants and pure helpers (no DOM state).

import type {MediaFile} from './types.js'
import {LANG} from './lang.js'

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

// The file name's extension: the query string, the fragment and dots in directories don't count.
export const extension = (url: string): string => {
    const path = url.split(/[?#]/)[0]
    const name = path.slice(path.lastIndexOf('/') + 1)
    const dot = name.lastIndexOf('.')
    return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
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

// 1536 -> "1,5 Ko" (LANG units, base 1024).
export const formatSize = (bytes: number): string => {
    const units = LANG.sizeUnits
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }
    const digits = unit === 0 || value >= 100 ? 0 : 1
    return `${value.toLocaleString(LANG.locale, {maximumFractionDigits: digits})} ${units[unit]}`
}

// "1,5 Mo · 1600 × 900", or '' when neither is known.
export const fileMeta = (file: MediaFile): string => [
    typeof file.size === 'number' ? formatSize(file.size) : null,
    file.width && file.height ? `${file.width} × ${file.height}` : null,
].filter(Boolean).join(' · ')
