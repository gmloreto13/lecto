import type { DocumentPage } from '../types/document'

const ABBREVIATIONS = new Set(
  [
    'sr', 'sra', 'srta', 'dr', 'dra', 'lic', 'ing', 'arq', 'prof', 'profa', 'sto', 'sta', 'ud', 'uds', 'vd', 'vds',
    'etc', 'pág', 'pag', 'págs', 'cap', 'vol', 'núm', 'num', 'no', 'art', 'fig', 'ej', 'aprox', 'av', 'avda',
    'c', 'cía', 'cia', 'dpto', 'depto', 'ed', 'edit', 'p', 'pp', 's', 'ss', 'tel', 'tlf', 'mr', 'mrs', 'ms',
    'jr', 'st', 'vs', 'e', 'g', 'i', 'a', 'cf', 'op', 'cit', 'ibid', 'id', 'col', 'gral', 'excmo', 'ilmo',
    'min', 'máx', 'max', 'mín', 'km', 'kg', 'cm', 'mm', 'ee', 'uu', 'hnos', 'sres', 'atte',
  ],
)

/** Normaliza el texto extraído de un PDF/EPUB: une guiones de corte, saltos sueltos y espacios. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/­/g, '')
    .replace(/[​﻿]/g, '')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** Divide en párrafos: doble salto, o salto simple tras puntuación final. */
export function splitParagraphs(text: string): string[] {
  const blocks = cleanText(text).split(/\n{2,}/)
  const out: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    let current = ''
    for (const line of lines) {
      const l = line.trim()
      if (!l) continue
      if (!current) {
        current = l
        continue
      }
      const endsSentence = /[.!?…:»”")]$/.test(current)
      const startsNew = /^[\p{Lu}¿¡«“"—–-]/u.test(l)
      if (endsSentence && startsNew && current.length < 400 && l.length > 0) {
        out.push(current)
        current = l
      } else {
        current += ' ' + l
      }
    }
    if (current) out.push(current)
  }
  return out.map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 0)
}

/** Divide un párrafo en oraciones sin cortar en abreviaturas, iniciales ni decimales. */
export function splitSentences(paragraph: string): string[] {
  const text = paragraph.trim()
  if (!text) return []
  const sentences: string[] = []
  let start = 0
  const re = /[.!?…]+["'»”)\]]*\s+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length
    const before = text.slice(start, m.index + 1)
    const wordMatch = /([\p{L}]+)\.$/u.exec(before)
    const next = text.slice(end, end + 2)
    if (m[0].startsWith('.') && wordMatch) {
      const word = wordMatch[1].toLowerCase()
      if (ABBREVIATIONS.has(word) || (word.length === 1 && /\p{Lu}/u.test(wordMatch[1]))) continue
    }
    // Siguiente carácter en minúscula o dígito: probablemente no es fin de oración.
    if (/^[\p{Ll}0-9]/u.test(next) && m[0].startsWith('.')) continue
    sentences.push(text.slice(start, end).trim())
    start = end
  }
  if (start < text.length) sentences.push(text.slice(start).trim())
  // Trocea oraciones demasiado largas (mejor fluidez de la síntesis de voz).
  const result: string[] = []
  for (const s of sentences) {
    if (s.length <= 320) {
      if (s) result.push(s)
      continue
    }
    let rest = s
    while (rest.length > 320) {
      let cut = rest.lastIndexOf(', ', 300)
      if (cut < 120) cut = rest.lastIndexOf('; ', 300)
      if (cut < 120) cut = rest.lastIndexOf(' ', 300)
      if (cut < 60) cut = 300
      result.push(rest.slice(0, cut + 1).trim())
      rest = rest.slice(cut + 1).trim()
    }
    if (rest) result.push(rest)
  }
  return result
}

export function textToParagraphs(text: string): string[][] {
  return splitParagraphs(text)
    .map(splitSentences)
    .filter((p) => p.length > 0)
}

/** Paginación virtual: agrupa párrafos en páginas de ~targetChars caracteres. */
export function paginate(paragraphs: string[][], targetChars = 1800): DocumentPage[] {
  const pages: DocumentPage[] = []
  let current: string[][] = []
  let size = 0
  for (const p of paragraphs) {
    const len = p.reduce((n, s) => n + s.length, 0)
    if (size > 0 && size + len > targetChars) {
      pages.push({ paragraphs: current })
      current = []
      size = 0
    }
    if (len > targetChars * 1.6) {
      // Párrafo enorme: repartir sus oraciones.
      let chunk: string[] = []
      let chunkSize = 0
      for (const s of p) {
        if (chunkSize + s.length > targetChars && chunk.length) {
          current.push(chunk)
          pages.push({ paragraphs: current })
          current = []
          chunk = []
          chunkSize = 0
        }
        chunk.push(s)
        chunkSize += s.length
      }
      if (chunk.length) {
        current.push(chunk)
        size = chunkSize
      }
      continue
    }
    current.push(p)
    size += len
  }
  if (current.length) pages.push({ paragraphs: current })
  return pages
}

export function pageSentences(page: DocumentPage | undefined): string[] {
  if (!page) return []
  return page.paragraphs.flat()
}

export function pageSentenceCount(page: DocumentPage | undefined): number {
  if (!page) return 0
  let n = 0
  for (const p of page.paragraphs) n += p.length
  return n
}

export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
