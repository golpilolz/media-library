// Calls to the bundle's endpoints. They answer {"result": "success", …}; anything else
// (or an HTTP error) rejects with the server message, or the HTTP status.

import type {MediaFile} from './types.js'

const send = async (url: string, init: RequestInit): Promise<any> => {
    const response = await fetch(url, init)
    const json = await response.json().catch(() => null)
    if (!response.ok || json?.result !== 'success') {
        throw new Error(json?.message ?? `HTTP ${response.status}`)
    }
    return json
}

export const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {headers: {Accept: 'application/json'}})
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
    }
    return response.json()
}

export const postJson = (url: string, body: object): Promise<any> => send(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify(body),
})

// Same request as a Dropzone upload: multipart fields `file` and `folder`.
export const uploadFile = async (url: string, file: Blob, name: string, folder: number): Promise<MediaFile> => {
    const formData = new FormData()
    formData.append('file', file, name)
    formData.append('folder', String(folder))
    const json = await send(url, {method: 'POST', headers: {Accept: 'application/json'}, body: formData})
    return {id: json.file.id, name: json.file.name, url: json.file.url}
}
