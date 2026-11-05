// Calls to the bundle's endpoints. They answer {"result": "success", …}; anything else
// (or an HTTP error) rejects with the server message, or the HTTP status.

import type {MediaFile, MediaFileInfo} from './types.js'

const send = async (url: string, init: RequestInit): Promise<any> => {
    const response = await fetch(url, init)
    const json = await response.json().catch(() => null)
    if (!response.ok || json?.result !== 'success') {
        throw new Error(json?.message ?? `HTTP ${response.status}`)
    }
    return json
}

// Header carrying the widget's CSRF token on write requests (empty token: CSRF protection is off).
export const CSRF_HEADER = 'X-CSRF-Token'

const csrfHeaders = (csrfToken: string): Record<string, string> => csrfToken === '' ? {} : {[CSRF_HEADER]: csrfToken}

// A file of an endpoint response, without the extra keys (e.g. upload's `parent`).
export const toMediaFile = ({id, name, url, size = null, width = null, height = null}: any): MediaFile =>
    ({id, name, url, size, width, height})

export const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {headers: {Accept: 'application/json'}})
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
    }
    return response.json()
}

export const postJson = (url: string, body: object, csrfToken = ''): Promise<any> => send(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json', ...csrfHeaders(csrfToken)},
    body: JSON.stringify(body),
})

// Same request as a Dropzone upload: multipart fields `file` and `folder`.
export const uploadFile = async (url: string, file: Blob, name: string, folder: number, csrfToken = ''): Promise<MediaFile> => {
    const formData = new FormData()
    formData.append('file', file, name)
    formData.append('folder', String(folder))
    const json = await send(url, {method: 'POST', headers: {Accept: 'application/json', ...csrfHeaders(csrfToken)}, body: formData})
    return toMediaFile(json.file)
}

// GET `url`?file=<id>: the file details of the file_info endpoint.
export const fetchFileInfo = async (url: string, id: number): Promise<MediaFileInfo> => {
    const target = new URL(url, window.location.href)
    target.searchParams.set('file', String(id))
    const json = await send(target.toString(), {headers: {Accept: 'application/json'}})
    return json.file
}
