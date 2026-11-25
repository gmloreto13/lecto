import type { DocumentFormat, ParseProgress, ReaderDocument } from '../types/document'

export const SUPPORTED_EXTENSIONS = ['.pdf', '.epub', '.txt', '.md', '.markdown'] as const
export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(',') + ',application/pdf,application/epub+zip,text/plain,text/markdown'

export function detectFormat(file: File): DocumentFormat | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (name.endsWith('.epub') || file.type === 'application/epub+zip') return 'epub'
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.txt') || file.type.startsWith('text/')) return 'txt'
  return null
}

export function isSupported(file: File) {
  return detectFormat(file) !== null
}

export interface ParseCallbacks {
  /** Se llama en cuanto hay páginas suficientes para empezar a leer. */
  onReady: (doc: ReaderDocument) => void
  /** Se llama cuando se añaden páginas procesadas en segundo plano. */
  onUpdate: (doc: ReaderDocument) => void
  onProgress: (p: ParseProgress) => void
}

export function newDocId() {
  return 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function hueFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Documento sin título'
}

export async function parseFile(file: File, cb: ParseCallbacks): Promise<void> {
  const format = detectFormat(file)
  if (!format) throw new Error('Formato no compatible. Usa PDF, EPUB, TXT o Markdown.')
  if (format === 'pdf') {
    const { parsePdf } = await import('./pdfParser')
    return parsePdf(file, cb)
  }
  if (format === 'epub') {
    const { parseEpub } = await import('./epubParser')
    return parseEpub(file, cb)
  }
  const { parseText } = await import('./textParser')
  return parseText(file, format === 'md' ? 'md' : 'txt', cb)
}
