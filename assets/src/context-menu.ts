// The hand-made right-click menu. It's position: fixed, see CLAUDE.md about transforms on ancestors.

import type {MenuItem} from './types.js'
import {escapeHtml} from './utils.js'

export const openContextMenu = (menu: HTMLElement, items: MenuItem[], x: number, y: number) => {
    menu.innerHTML = items.map((item, index) =>
        `<button type="button" role="menuitem" class="ml-context-item" data-index="${index}">${escapeHtml(item.label)}</button>`).join('')
    menu.querySelectorAll<HTMLButtonElement>('.ml-context-item').forEach(button => {
        button.addEventListener('click', () => {
            closeContextMenu(menu)
            items[Number(button.dataset.index)].action()
        })
    })
    menu.hidden = false

    // Keep the menu inside the viewport.
    const {innerWidth, innerHeight} = window
    const {width, height} = menu.getBoundingClientRect()
    menu.style.left = `${Math.min(x, innerWidth - width - 4)}px`
    menu.style.top = `${Math.min(y, innerHeight - height - 4)}px`
    menu.querySelector<HTMLButtonElement>('button')?.focus()
}

export const closeContextMenu = (menu: HTMLElement | null) => {
    if (menu) {
        menu.hidden = true
    }
}
