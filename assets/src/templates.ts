// Static markup of the popup and of the widget's preview tiles.

import type {MediaFile} from './types.js'
import {LANG} from './lang.js'
import {escapeHtml, iconFor, isImage} from './utils.js'

// `upload`: show the "Importer" button (an upload URL is set).
export const layoutTemplate = (upload: boolean): string => {
    const searchIcon = '<svg class="ml-search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

    return `
        <header class="ml-header">
            <h2 class="ml-heading">${LANG.title}</h2>
        </header>
        <div class="ml-toolbar">
            <nav class="ml-breadcrumb" aria-label="${LANG.breadcrumb}"></nav>
            <div class="ml-toolbar-actions">
                <div class="ml-segmented" role="group" aria-label="${LANG.sort}">
                    <button type="button" class="ml-segment active" data-ml-action="sort-asc" title="${LANG.sortAsc}" aria-label="${LANG.sortAsc}" aria-pressed="true"><span class="icon-sort-alpha-asc"></span></button>
                    <button type="button" class="ml-segment" data-ml-action="sort-desc" title="${LANG.sortDesc}" aria-label="${LANG.sortDesc}" aria-pressed="false"><span class="icon-sort-alpha-desc"></span></button>
                </div>
                <button type="button" class="ml-icon-btn" data-ml-action="open-folder" title="${LANG.openFolder}" aria-label="${LANG.openFolder}"><span class="icon-folder-open"></span></button>
                <button type="button" class="ml-icon-btn" data-ml-action="zoom" title="${LANG.zoom}" aria-label="${LANG.zoom}"><span class="icon-zoom-in"></span></button>
                <button type="button" class="ml-icon-btn" data-ml-action="actions" title="${LANG.actions}" aria-label="${LANG.actions}" aria-haspopup="menu"><span class="icon-more"></span></button>
                ${upload ? `<button type="button" class="ml-icon-btn" data-ml-action="upload" title="${LANG.upload}" aria-label="${LANG.upload}"><span class="icon-upload"></span></button>
                <input type="file" class="ml-upload-input" multiple hidden tabindex="-1">` : ''}
                <label class="ml-search-field">${searchIcon}
                    <input type="search" class="ml-search" placeholder="${LANG.search}" aria-label="${LANG.search}">
                </label>
            </div>
        </div>
        <div class="ml-body">
            <nav class="ml-tree" aria-label="${LANG.folders}"></nav>
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

// Keep in sync with the widget template.
export const previewTemplate = (file: MediaFile, multiple: boolean, identifier: string): string => {
    const name = escapeHtml(file.name)
    return `<div class="ml-preview-item" data-file-id="${file.id}" title="${name}">
        <span class="ml-preview-thumb ml-thumb--${isImage(file) ? 'picture' : iconFor(file)}">${isImage(file) ? `<img src="${escapeHtml(file.url)}" alt="" loading="lazy">` : ''}</span>
        <span class="ml-preview-name">${name}</span>
        ${multiple ? `<button type="button" class="ml-preview-remove" data-action="${identifier}#remove" data-${identifier}-id-param="${file.id}" aria-label="${LANG.remove} ${name}" title="${LANG.remove}">
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>
        </button>` : ''}
    </div>`
}
