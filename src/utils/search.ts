import type { ReaderDocument } from '../types/document'
import { normalizeForSearch, pageSentences } from './textSegmentation'

export interface SearchHit {
  page: number
  sentence: number
  before: string
  match: string
  after: string
}

/** Busca sin distinguir mayúsculas ni acentos. El texto normalizado conserva los índices del original. */
export function searchDocument(doc: ReaderDocument, query: string, limit = 300): { hits: SearchHit[]; truncated: boolean } {
  const q = normalizeForSearch(query.trim())
  const hits: SearchHit[] = []
  if (q.length < 2) return { hits, truncated: false }
  for (let p = 0; p < doc.pages.length; p++) {
    const sentences = pageSentences(doc.pages[p])
    for (let s = 0; s < sentences.length; s++) {
      const original = sentences[s]
      const norm = normalizeForSearch(original)
      if (norm.length !== original.length) {
        // Caracteres compuestos raros: búsqueda simple.
        const i = norm.indexOf(q)
        if (i >= 0) hits.push({ page: p, sentence: s, before: '', match: original, after: '' })
      } else {
        let from = 0
        let i: number
        while ((i = norm.indexOf(q, from)) >= 0) {
          hits.push({
            page: p,
            sentence: s,
            before: (i > 50 ? '…' : '') + original.slice(Math.max(0, i - 50), i),
            match: original.slice(i, i + q.length),
            after: original.slice(i + q.length, i + q.length + 70) + (i + q.length + 70 < original.length ? '…' : ''),
          })
          from = i + q.length
          if (hits.length >= limit) return { hits, truncated: true }
        }
      }
      if (hits.length >= limit) return { hits, truncated: true }
    }
  }
  return { hits, truncated: false }
}
