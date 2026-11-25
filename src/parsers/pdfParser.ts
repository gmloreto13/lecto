import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { MAX_DOCUMENT_PAGES, type DocumentChapter, type DocumentPage, type ReaderDocument } from '../types/document'
import { textToParagraphs } from '../utils/textSegmentation'
import { hueFromString, newDocId, titleFromFileName, type ParseCallbacks } from './index'

const FIRST_BATCH = 5
const BATCH_SIZE = 20

let workerReady: Promise<void> | null = null

function setupWorker() {
  if (workerReady) return workerReady
  workerReady = (async () => {
    if (import.meta.env.MODE === 'single') {
      // Compilación de un solo archivo: el worker corre en el hilo principal.
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs')
      ;(globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = worker
    } else {
      const url = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = url
    }
  })()
  return workerReady
}

interface TextItemLike {
  str: string
  hasEOL?: boolean
  transform?: number[]
}

async function extractPage(pdf: PDFDocumentProxy, n: number): Promise<DocumentPage> {
  const page = await pdf.getPage(n)
  const content = await page.getTextContent()
  let text = ''
  let lastY: number | null = null
  let lastHeight = 12
  for (const raw of content.items as TextItemLike[]) {
    if (typeof raw.str !== 'string') continue
    const y = raw.transform ? raw.transform[5] : null
    const h = raw.transform ? Math.abs(raw.transform[3]) || lastHeight : lastHeight
    if (lastY !== null && y !== null) {
      const gap = Math.abs(lastY - y)
      if (gap > h * 1.9) text += '\n\n'
      else if (gap > h * 0.5 && !text.endsWith('\n')) text += '\n'
    }
    text += raw.str
    if (raw.hasEOL) text += '\n'
    if (y !== null) lastY = y
    lastHeight = h
  }
  page.cleanup()
  const paragraphs = textToParagraphs(text)
  // Quita números de página sueltos.
  const filtered = paragraphs.filter((p) => !(p.length === 1 && /^\d{1,4}$/.test(p[0].trim())))
  return { paragraphs: filtered.length ? filtered : [[`Página ${n} sin texto seleccionable.`]] }
}

async function extractOutline(pdf: PDFDocumentProxy): Promise<DocumentChapter[]> {
  try {
    const outline = await pdf.getOutline()
    if (!outline) return []
    const chapters: DocumentChapter[] = []
    const walk = async (items: typeof outline, level: number) => {
      for (const item of items) {
        try {
          let dest = item.dest
          if (typeof dest === 'string') dest = await pdf.getDestination(dest)
          if (Array.isArray(dest) && dest[0]) {
            const index = await pdf.getPageIndex(dest[0] as Parameters<PDFDocumentProxy['getPageIndex']>[0])
            if (index < MAX_DOCUMENT_PAGES) chapters.push({ title: item.title.trim(), page: index, level })
          }
        } catch {
          /* destino roto: se ignora */
        }
        if (item.items?.length && level < 3) await walk(item.items, level + 1)
      }
    }
    await walk(outline, 1)
    return chapters
  } catch {
    return []
  }
}

export async function parsePdf(file: File, cb: ParseCallbacks) {
  await setupWorker()
  cb.onProgress({ fileName: file.name, stage: 'reading', loaded: 0, total: 1 })
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise
  const total = Math.min(pdf.numPages, MAX_DOCUMENT_PAGES)
  let title = titleFromFileName(file.name)
  let author: string | undefined
  try {
    const meta = await pdf.getMetadata()
    const info = meta.info as { Title?: string; Author?: string }
    if (info?.Title && info.Title.trim().length > 2 && !/^untitled|^microsoft word/i.test(info.Title)) title = info.Title.trim()
    if (info?.Author?.trim()) author = info.Author.trim()
  } catch {
    /* sin metadatos */
  }

  const pages: DocumentPage[] = []
  cb.onProgress({ fileName: file.name, stage: 'parsing', loaded: 0, total })
  const first = Math.min(FIRST_BATCH, total)
  for (let i = 1; i <= first; i++) {
    pages.push(await extractPage(pdf, i))
    cb.onProgress({ fileName: file.name, stage: 'parsing', loaded: i, total })
  }
  const chapters = await extractOutline(pdf)
  const doc: ReaderDocument = {
    id: newDocId(),
    title,
    author,
    format: 'pdf',
    pages,
    chapters,
    totalPages: total,
    complete: first >= total,
    createdAt: Date.now(),
    hue: hueFromString(title),
  }
  cb.onReady({ ...doc, pages: [...pages] })

  for (let start = first + 1; start <= total; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, total)
    for (let i = start; i <= end; i++) pages.push(await extractPage(pdf, i))
    cb.onProgress({ fileName: file.name, stage: 'background', loaded: end, total })
    cb.onUpdate({ ...doc, pages: [...pages], complete: end >= total })
    await new Promise((r) => setTimeout(r, 0))
  }
  cb.onProgress({ fileName: file.name, stage: 'done', loaded: total, total })
  await pdf.destroy()
}
