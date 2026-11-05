// The popup's modal dialogs (native <dialog>, reused for every action).

import type {DialogButton} from './types.js'
import {LANG} from './lang.js'
import {escapeHtml} from './utils.js'

// Fill `dialog` and open it. A button's action may be async: it keeps the dialog open
// (and shows the error's message) when it throws, or when it returns false.
export const openDialog = (dialog: HTMLDialogElement, title: string, body: string, buttons: DialogButton[], className = '') => {
    // No <form> here: the widget usually sits inside the page's Symfony form, where a nested
    // <form> is dropped by the HTML parser. All buttons are type="button" for the same reason.
    dialog.className = `ml-dialog ${className}`
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

export const labelForm = (value = ''): string => `<label class="ml-label">${LANG.label}
    <input type="text" class="ml-input" name="title" value="${escapeHtml(value)}" required autofocus>
</label>`

// The trimmed value of labelForm()'s input; throws (shown in the dialog) when it's blank.
export const readTitle = (dialog: HTMLDialogElement): string => {
    const title = dialog.querySelector<HTMLInputElement>('[name="title"]').value.trim()
    if (title === '') {
        throw new Error(LANG.emptyLabel)
    }
    return title
}
