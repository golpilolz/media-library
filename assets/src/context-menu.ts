// The hand-made context menu (right-click, the ContextMenu key or the "Actions" button).
// It's position: fixed, see CLAUDE.md about transforms on ancestors.

import type {MenuItem} from './types.js'
import {escapeHtml} from './utils.js'

// Element that had the focus when each menu opened: it gets it back when the menu closes.
const openers = new WeakMap<HTMLElement, HTMLElement>()

export const openContextMenu = (menu: HTMLElement, items: MenuItem[], x: number, y: number) => {
    if (document.activeElement instanceof HTMLElement && !menu.contains(document.activeElement)) {
        openers.set(menu, document.activeElement)
    }
    menu.innerHTML = items.map((item, index) =>
        `<button type="button" role="menuitem" class="ml-context-item" data-index="${index}" tabindex="-1">${escapeHtml(item.label)}</button>`).join('')
    const buttons = [...menu.querySelectorAll<HTMLButtonElement>('.ml-context-item')]
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Back to the opener first, so a dialog the action opens returns the focus there.
            closeContextMenu(menu, true)
            items[Number(button.dataset.index)].action()
        })
    })
    // Arrow keys, Home and End move between items; Tab and Escape leave the menu.
    menu.onkeydown = (event: KeyboardEvent) => {
        // Handled here, on keydown: preventing it stops the popup <dialog>'s cancel, which Chrome
        // doesn't always let a page cancel (only once per user activation).
        if (event.key === 'Escape') {
            event.preventDefault()
            closeContextMenu(menu, true)
            return
        }
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = {
            ArrowDown: (index + 1) % buttons.length,
            ArrowUp: (index - 1 + buttons.length) % buttons.length,
            Home: 0,
            End: buttons.length - 1,
        }[event.key]
        if (next !== undefined) {
            event.preventDefault()
            buttons[next].focus()
        } else if (event.key === 'Tab') {
            event.preventDefault()
            closeContextMenu(menu, true)
        }
    }
    menu.hidden = false

    // Keep the menu inside the viewport.
    const {innerWidth, innerHeight} = window
    const {width, height} = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(4, Math.min(x, innerWidth - width - 4))}px`
    menu.style.top = `${Math.max(4, Math.min(y, innerHeight - height - 4))}px`
    buttons[0]?.focus()
}

export const isContextMenuOpen = (menu: HTMLElement | null): boolean => menu !== null && !menu.hidden

// `restoreFocus`: give the focus back to the menu's opener (keyboard close, item chosen).
export const closeContextMenu = (menu: HTMLElement | null, restoreFocus = false) => {
    if (!menu || menu.hidden) {
        return
    }
    menu.hidden = true
    const opener = openers.get(menu)
    openers.delete(menu)
    if (restoreFocus && opener?.isConnected) {
        opener.focus({preventScroll: true})
    }
}
