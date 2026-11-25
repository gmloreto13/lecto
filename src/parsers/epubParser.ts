import JSZip from 'jszip'
import { MAX_DOCUMENT_PAGES, type DocumentChapter, type DocumentPage, type ReaderDocument } from '../types/document'
import { paginate, textToParagraphs } from '../utils/textSegmentation'
import { hueFromString, newDocId, titleFromFileName, type ParseCallbacks } from './index'

function resolvePath(base: string, href: string) {
  const clean = decodeURIComponent(href.split('#')[0])
  if (!base) return clean
  const parts = (base + clean).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p !== '.' && p !== '') out.push(p)
  }
  return out.join('/')
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'section', 'article', 'tr', 'dd', 'dt', 'figcaption', 'pre', 'br'])

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'application/xhtml+xml')
  const body =
    doc.getElementsByTagName('parsererror').length > 0
      ? new DOMParser().parseFromString(html, 'text/html').body
      : (doc.getElementsByTagName('body')[0] ?? doc.documentElement)
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? '').replace(/\s+/g, ' ')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.localName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'head') return
    if (tag === 'sup' && el.querySelector('a')) return // notas al pie
    const block = BLOCK_TAGS.has(tag)
    if (block) out += '\n\n'
    el.childNodes.forEach(walk)
    if (block) out += '\n\n'
  }
  if (body) walk(body)
  return out
}

export async function parseEpub(file: File, cb: ParseCallbacks) {
  cb.onProgress({ fileName: file.name, stage: 'reading', loaded: 0, total: 1 })
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')

  const container = await zip.file('META-INF/container.xml')?.async('string')
  if (!container) throw new Error('EPUB no válido: falta META-INF/container.xml')
  const opfPath = xml(container).getElementsByTagName('rootfile')[0]?.getAttribute('full-path')
  if (!opfPath) throw new Error('EPUB no válido: no se encontró el paquete OPF')
  const opfText = await zip.file(opfPath)?.async('string')
  if (!opfText) throw new Error('EPUB no válido: no se pudo leer el OPF')
  const opf = xml(opfText)
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  const dcTitle = opf.getElementsByTagNameNS('*', 'title')[0]?.textContent?.trim()
  const dcAuthor = opf.getElementsByTagNameNS('*', 'creator')[0]?.textContent?.trim()
  const title = dcTitle || titleFromFileName(file.name)

  const manifest = new Map<string, { href: string; type: string; props: string }>()
  for (const item of Array.from(opf.getElementsByTagNameNS('*', 'item'))) {
    manifest.set(item.getAttribute('id') ?? '', {
      href: resolvePath(base, item.getAttribute('href') ?? ''),
      type: item.getAttribute('media-type') ?? '',
      props: item.getAttribute('properties') ?? '',
    })
  }
  const spine = Array.from(opf.getElementsByTagNameNS('*', 'itemref'))
    .map((r) => manifest.get(r.getAttribute('idref') ?? ''))
    .filter((x): x is { href: string; type: string; props: string } => !!x && /html|xml/.test(x.type))

  // Tabla de contenidos: NCX (EPUB 2) o nav (EPUB 3).
  const tocEntries: { title: string; href: string; level: number }[] = []
  const ncxId = opf.getElementsByTagNameNS('*', 'spine')[0]?.getAttribute('toc')
  const ncx = ncxId ? manifest.get(ncxId) : [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml')
  if (ncx) {
    const ncxText = await zip.file(ncx.href)?.async('string')
    if (ncxText) {
      const ncxBase = ncx.href.includes('/') ? ncx.href.slice(0, ncx.href.lastIndexOf('/') + 1) : ''
      const walk = (parent: Element, level: number) => {
        for (const np of Array.from(parent.children).filter((c) => c.localName === 'navPoint')) {
          const label = np.getElementsByTagNameNS('*', 'text')[0]?.textContent?.trim()
          const src = np.getElementsByTagNameNS('*', 'content')[0]?.getAttribute('src')
          if (label && src) tocEntries.push({ title: label, href: resolvePath(ncxBase, src), level })
          walk(np, level + 1)
        }
      }
      const navMap = xml(ncxText).getElementsByTagNameNS('*', 'navMap')[0]
      if (navMap) walk(navMap, 1)
    }
  }
  if (!tocEntries.length) {
    const nav = [...manifest.values()].find((m) => m.props.includes('nav'))
    const navText = nav ? await zip.file(nav.href)?.async('string') : undefined
    if (nav && navText) {
      const navBase = nav.href.includes('/') ? nav.href.slice(0, nav.href.lastIndexOf('/') + 1) : ''
      const d = new DOMParser().parseFromString(navText, 'text/html')
      d.querySelectorAll('nav a[href]').forEach((a) => {
        const depth = Math.max(1, (a.closest('ol')?.parentElement?.closest('ol') ? 2 : 1))
        tocEntries.push({ title: a.textContent?.trim() || 'Capítulo', href: resolvePath(navBase, a.getAttribute('href') ?? ''), level: depth })
      })
    }
  }

  const pages: DocumentPage[] = []
  const chapters: DocumentChapter[] = []
  const doc: ReaderDocument = {
    id: newDocId(),
    title,
    author: dcAuthor,
    format: 'epub',
    pages,
    chapters,
    totalPages: 0,
    complete: false,
    createdAt: Date.now(),
    hue: hueFromString(title),
  }
  let announced = false
  const total = spine.length
  cb.onProgress({ fileName: file.name, stage: 'parsing', loaded: 0, total })

  for (let i = 0; i < spine.length && pages.length < MAX_DOCUMENT_PAGES; i++) {
    const item = spine[i]
    const html = await zip.file(item.href)?.async('string')
    const startPage = pages.length
    if (html) {
      const paragraphs = textToParagraphs(htmlToText(html))
      if (paragraphs.length) pages.push(...paginate(paragraphs))
    }
    for (const t of tocEntries.filter((t) => t.href === item.href)) {
      if (startPage < pages.length) chapters.push({ title: t.title, page: startPage, level: t.level })
    }
    if (pages.length > MAX_DOCUMENT_PAGES) pages.length = MAX_DOCUMENT_PAGES
    doc.totalPages = pages.length
    cb.onProgress({ fileName: file.name, stage: announced ? 'background' : 'parsing', loaded: i + 1, total })
    if (!announced && pages.length >= 3) {
      announced = true
      cb.onReady({ ...doc, pages: [...pages], chapters: [...chapters], totalPages: pages.length })
    } else if (announced && i % 5 === 4) {
      cb.onUpdate({ ...doc, pages: [...pages], chapters: [...chapters], totalPages: pages.length })
    }
    await new Promise((r) => setTimeout(r, 0))
  }
  if (!pages.length) pages.push({ paragraphs: [['Este EPUB no contiene texto legible.']] })
  const final = { ...doc, pages: [...pages], chapters: [...chapters], totalPages: pages.length, complete: true }
  if (!announced) cb.onReady(final)
  else cb.onUpdate(final)
  cb.onProgress({ fileName: file.name, stage: 'done', loaded: total, total })
}
