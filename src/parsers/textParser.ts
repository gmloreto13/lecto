import { MAX_DOCUMENT_PAGES, type DocumentChapter, type DocumentPage, type ReaderDocument } from '../types/document'
import { paginate, textToParagraphs } from '../utils/textSegmentation'
import { hueFromString, newDocId, titleFromFileName, type ParseCallbacks } from './index'

function stripInlineMarkdown(s: string) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
}

export function buildFromText(text: string, isMarkdown: boolean, fallbackTitle: string) {
  const pages: DocumentPage[] = []
  const chapters: DocumentChapter[] = []
  let title = fallbackTitle

  if (!isMarkdown) {
    pages.push(...paginate(textToParagraphs(text)))
  } else {
    // Separa por encabezados: cada encabezado inicia un capítulo en página nueva.
    const sections: { title: string; level: number; body: string }[] = []
    let current = { title: '', level: 0, body: '' }
    for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
      const h = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line)
      if (h) {
        if (current.title || current.body.trim()) sections.push(current)
        current = { title: stripInlineMarkdown(h[2]), level: h[1].length, body: '' }
      } else {
        current.body += line + '\n'
      }
    }
    if (current.title || current.body.trim()) sections.push(current)
    const firstH1 = sections.find((s) => s.level === 1)
    if (firstH1) title = firstH1.title
    for (const sec of sections) {
      const paragraphs = textToParagraphs(stripInlineMarkdown(sec.body))
      if (sec.title) paragraphs.unshift([sec.title])
      if (!paragraphs.length) continue
      if (sec.title) chapters.push({ title: sec.title, page: pages.length, level: sec.level })
      pages.push(...paginate(paragraphs))
    }
  }
  if (!pages.length) pages.push({ paragraphs: [['Este documento no contiene texto legible.']] })
  return { title, pages: pages.slice(0, MAX_DOCUMENT_PAGES), chapters: chapters.filter((c) => c.page < MAX_DOCUMENT_PAGES) }
}

export async function parseText(file: File, format: 'txt' | 'md', cb: ParseCallbacks) {
  cb.onProgress({ fileName: file.name, stage: 'reading', loaded: 0, total: 1 })
  const text = await file.text()
  cb.onProgress({ fileName: file.name, stage: 'parsing', loaded: 0, total: 1 })
  const { title, pages, chapters } = buildFromText(text, format === 'md', titleFromFileName(file.name))
  const doc: ReaderDocument = {
    id: newDocId(),
    title,
    format,
    pages,
    chapters,
    totalPages: pages.length,
    complete: true,
    createdAt: Date.now(),
    hue: hueFromString(title),
  }
  cb.onReady(doc)
  cb.onProgress({ fileName: file.name, stage: 'done', loaded: pages.length, total: pages.length })
}
