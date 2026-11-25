import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { ReaderDocument } from '../types/document'
import { searchDocument, type SearchHit } from '../utils/search'
import { Icon } from './Icons'

export function SearchPanel({ doc, onPick, initial = '' }: { doc: ReaderDocument; onPick: (hit: SearchHit, query: string) => void; initial?: string }) {
  const [q, setQ] = useState(initial)
  const deferred = useDeferredValue(q)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [])
  const { hits, truncated } = useMemo(() => searchDocument(doc, deferred), [doc, deferred])
  const pages = useMemo(() => new Set(hits.map((h) => h.page)).size, [hits])
  const chapterOf = (page: number) => {
    let t: string | undefined
    for (const c of doc.chapters) if (c.page <= page) t = c.title
    return t
  }

  return (
    <div className="flex h-full flex-col">
      <label className="sticky top-0 z-10 flex h-12 items-center gap-2 rounded-2xl bg-surface-2 px-4 focus-within:ring-2 focus-within:ring-accent">
        <Icon.Search size={18} className="shrink-0 text-ink-3" />
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar palabras o frases"
          className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
          aria-label="Buscar en el documento"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Borrar búsqueda" className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2">
            <Icon.X size={14} />
          </button>
        )}
      </label>
      <p className="mt-3 mb-2 px-1 text-xs text-ink-3" aria-live="polite">
        {deferred.trim().length < 2
          ? 'Escribe al menos dos letras. No distingue mayúsculas ni acentos.'
          : hits.length
            ? `${hits.length}${truncated ? '+' : ''} resultados en ${pages} ${pages === 1 ? 'página' : 'páginas'}`
            : 'Sin resultados.'}
        {!doc.complete && deferred.trim().length >= 2 && ' Aún se están procesando páginas.'}
      </p>
      <ul className="-mx-2 flex flex-col">
        {hits.map((h, i) => (
          <li key={i}>
            <button onClick={() => onPick(h, deferred)} className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-surface-2">
              <span className="flex items-center gap-2 text-[11px] text-ink-3">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">pág. {h.page + 1}</span>
                <span className="truncate">{chapterOf(h.page)}</span>
              </span>
              <span className="mt-1.5 block font-serif text-[15px] leading-snug text-ink-2">
                {h.before}
                <mark className="search-hit">{h.match}</mark>
                {h.after}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
