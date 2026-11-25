import { useEffect, useMemo, useState } from 'react'
import type { Bookmark, ReaderDocument } from '../types/document'
import { Icon } from './Icons'

interface Props {
  doc: ReaderDocument
  currentPage: number
  bookmarks: Bookmark[]
  onGoToPage: (page: number) => void
}

/** Índice: salto directo, capítulos y cuadrícula de páginas agrupadas de 100 en 100. */
export function TocPanel({ doc, currentPage, bookmarks, onGoToPage }: Props) {
  const total = doc.totalPages
  const groups = Math.ceil(total / 100)
  const [group, setGroup] = useState(Math.floor(currentPage / 100))
  const [jump, setJump] = useState('')
  const [tab, setTab] = useState<'chapters' | 'pages'>(doc.chapters.length ? 'chapters' : 'pages')
  useEffect(() => setGroup(Math.floor(currentPage / 100)), [currentPage])
  const marked = useMemo(() => new Set(bookmarks.map((b) => b.page)), [bookmarks])
  const currentChapter = useMemo(() => {
    let idx = -1
    doc.chapters.forEach((c, i) => {
      if (c.page <= currentPage) idx = i
    })
    return idx
  }, [doc.chapters, currentPage])

  const submit = () => {
    const n = parseInt(jump, 10)
    if (n >= 1 && n <= total) {
      onGoToPage(n - 1)
      setJump('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-surface-2 px-4">
          <span className="shrink-0 text-sm text-ink-3">Ir a página</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
            placeholder={`1–${total}`}
            className="w-full min-w-0 bg-transparent text-right font-mono text-base text-ink outline-none placeholder:text-ink-3"
            aria-label="Número de página"
          />
        </label>
        <button type="submit" className="h-12 rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-40" disabled={!jump}>
          Ir
        </button>
      </form>

      {doc.chapters.length > 0 && (
        <div className="flex rounded-2xl bg-surface-2 p-1">
          {(['chapters', 'pages'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-9 flex-1 rounded-xl text-sm font-semibold transition ${tab === t ? 'bg-surface text-ink shadow-soft' : 'text-ink-2'}`}
            >
              {t === 'chapters' ? `Capítulos · ${doc.chapters.length}` : `Páginas · ${total}`}
            </button>
          ))}
        </div>
      )}

      {tab === 'chapters' && doc.chapters.length > 0 ? (
        <ol className="-mx-2 flex flex-col">
          {doc.chapters.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => onGoToPage(c.page)}
                className={`flex w-full items-baseline gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-2 ${
                  i === currentChapter ? 'bg-accent-soft' : ''
                }`}
                style={{ paddingLeft: `${0.75 + ((c.level ?? 1) - 1) * 1}rem` }}
              >
                <span className={`min-w-0 flex-1 text-[15px] leading-snug ${i === currentChapter ? 'font-semibold text-accent-text' : 'text-ink'}`}>{c.title}</span>
                <span className="shrink-0 font-mono text-xs text-ink-3">{c.page + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div>
          {groups > 1 && (
            <div className="scrollbar-none -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {Array.from({ length: groups }, (_, g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`h-8 shrink-0 rounded-full px-3 font-mono text-xs transition ${
                    g === group ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                  }`}
                >
                  {g * 100 + 1}–{Math.min(total, (g + 1) * 100)}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: Math.min(100, total - group * 100) }, (_, i) => {
              const page = group * 100 + i
              const loaded = page < doc.pages.length
              const current = page === currentPage
              return (
                <button
                  key={page}
                  disabled={!loaded}
                  onClick={() => onGoToPage(page)}
                  className={`relative aspect-square rounded-lg font-mono text-xs transition ${
                    current
                      ? 'bg-accent font-semibold text-accent-ink'
                      : loaded
                        ? 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                        : 'bg-surface-2/50 text-ink-3/50'
                  }`}
                  aria-label={`Página ${page + 1}`}
                  aria-current={current ? 'page' : undefined}
                >
                  {page + 1}
                  {marked.has(page) && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" />}
                </button>
              )
            })}
          </div>
          {!doc.complete && (
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
              <Icon.Timer size={14} /> Procesando páginas: {doc.pages.length} de {total}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
