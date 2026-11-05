// The "Informations" dialog's markup: a preview and a list of the file's details.

import type {MediaFileInfo} from './types.js'
import {LANG} from './lang.js'
import {escapeHtml, extension, formatSize, iconFor, isImage} from './utils.js'

const pending = '<span class="ml-info-pending" aria-hidden="true"></span>'

// `loading`: the details only the server knows are shown as placeholders.
export const infoTemplate = (info: MediaFileInfo, loading: boolean): string => {
    const row = (label: string, value: string | null) => value === null
        ? ''
        : `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`
    // A server detail: a placeholder while loading, hidden when unknown.
    const detail = (value: unknown, format: () => string) =>
        loading ? pending : value === null || value === undefined ? null : format()

    const ext = info.extension || extension(info.url)
    const type = [info.mimeType, ext ? ext.toUpperCase() : null].filter(Boolean)
    const modified = info.modifiedAt ? new Date(info.modifiedAt) : null

    return `<div class="ml-info${loading ? ' ml-info--loading' : ''}" aria-busy="${loading}">
        <div class="ml-info-preview ml-thumb--${isImage(info) ? 'picture' : iconFor(info)}">
            ${isImage(info) ? `<img src="${escapeHtml(info.url)}" alt="">` : ''}
        </div>
        <dl class="ml-info-list">
            ${row(LANG.infoName, escapeHtml(info.name))}
            ${row(LANG.infoFolder, escapeHtml([LANG.root, ...(info.path ?? [])].join(' › ')))}
            ${row(LANG.infoType, loading && !info.mimeType ? pending : type.length ? escapeHtml(type.join(' · ')) : null)}
            ${row(LANG.infoSize, detail(info.size, () => escapeHtml(formatSize(info.size))))}
            ${row(LANG.infoDimensions, isImage(info) || info.width ? detail(info.width, () => `${info.width} × ${info.height} px`) : null)}
            ${row(LANG.infoModified, detail(modified, () => escapeHtml(modified.toLocaleString('fr-FR', {dateStyle: 'long', timeStyle: 'short'}))))}
            ${row(LANG.infoUrl, `<a href="${escapeHtml(info.url)}" target="_blank" rel="noopener">${escapeHtml(info.url)}</a>`)}
            ${row(LANG.infoId, escapeHtml(info.id))}
        </dl>
    </div>`
}
