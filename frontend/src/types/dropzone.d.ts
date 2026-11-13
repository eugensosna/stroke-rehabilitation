// Мінімальні типи бібліотеки dropzone (пакет не містить власних оголошень) — лише те, що використовує DropzoneUpload.vue
declare module 'dropzone' {
  export interface DropzoneOptions {
    url: string
    thumbnailWidth?: number
    maxFilesize?: number
    acceptedFiles?: string
    headers?: Record<string, string>
    dictDefaultMessage?: string
    init?: (this: Dropzone) => void
  }

  export default class Dropzone {
    static autoDiscover: boolean
    constructor(element: string | HTMLElement, options: DropzoneOptions)
    on(event: 'addedfile', callback: (file: File) => void): this
    on(event: 'success', callback: (file: File, response: unknown) => void): this
    on(event: 'error', callback: (file: File, error: string | Error) => void): this
    destroy(): void
  }
}
