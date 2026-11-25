import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Bookmark, DocumentPage } from '../types/document'
import { Icon } from './Icons'

interface Props {
  page: DocumentPage | undefined
  pageIndex: number
  totalPages: number
  chapterTitle?: string
  activeSentence: number | null
  selectedSentence: number | null
  flashSentence: number | null
  bookmarks: Bookmark[]
  fontSize: number
  lineHeight: number
  autoScroll: boolean
  isPlaying: boolean
  onSentenceTap: (index: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

const PageText = memo(function PageText({
  page,
  activeSentence,
  selectedSentence,
  flashSentence,
  marks,
  onSentenceTap,
}: {
  page: DocumentPage
  activeSentence: number | null
  selectedSentence: number | null
  flashSentence: number | null
  marks: Map<number, Bookmark>
  onSentenceTap: (i: number) => void
}) {
  let idx = 0
  return (
    <>
      {page.paragraphs.map((para, pi) => {
        const isHeading = para.length === 1 && para[0].length < 90 && !/[.,;:]$/.test(para[0]) && pi === 0
        const Tag = isHeading ? 'h2' : 'p'
        return (
          <Tag key={pi} className={isHeading ? 'mb-5 font-sans text-[1.35em] leading-tight font-bold tracking-tight text-ink' : ''}>
            {para.map((s, si) => {
              const i = idx++
              const mark = marks.get(i)
              return (
                <span key={si}>
                  <span
                    data-s={i}
                    data-active={i === activeSentence ? '' : undefined}
                    data-selected={i === selectedSentence ? '' : undefined}
                    data-flash={i === flashSentence ? '' : undefined}
                    data-mark={mark?.color}
                    className="sentence"
                    onClick={() => onSentenceTap(i)}
                  >
                    {s}
                    {mark?.note && <Icon.Note size={13} className="ml-1 inline-block -translate-y-0.5 text-accent-text" />}
                  </span>{' '}
                </span>
              )
            })}
          </Tag>
        )
      })}
    </>
  )
})

export function ReaderViewport(p: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number; t: number } | null>(null)
  const marks = useMemo(() => new Map(p.bookmarks.map((b) => [b.sentence, b])), [p.bookmarks])

  // Al cambiar de página, vuelve arriba.
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [p.pageIndex])

  // Mantiene la frase en curso visible.
  useEffect(() => {
    const target = p.flashSentence ?? (p.isPlaying && p.autoScroll ? p.activeSentence : null)
    if (target === null || !scroller.current) return
    const el = scroller.current.querySelector<HTMLElement>(`[data-s="${target}"]`)
    if (!el) return
    const box = scroller.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const margin = box.height * 0.22
    if (p.flashSentence !== null || r.top < box.top + margin || r.bottom > box.bottom - margin * 1.6) {
      scroller.current.scrollBy({ top: r.top - box.top - box.height * 0.3, behavior: 'smooth' })
    }
  }, [p.activeSentence, p.flashSentence, p.isPlaying, p.autoScroll, p.pageIndex])

  return (
    <div
      ref={scroller}
      className="h-full overflow-y-auto overscroll-contain"
      onTouchStart={(e) => {
        const t = e.touches[0]
        touch.current = { x: t.clientX, y: t.clientY, t: Date.now() }
      }}
      onTouchEnd={(e) => {
        const s = touch.current
        touch.current = null
        if (!s) return
        const t = e.changedTouches[0]
        const dx = t.clientX - s.x
        const dy = t.clientY - s.y
        if (Date.now() - s.t < 600 && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
          if (dx < 0) p.onNextPage()
          else p.onPrevPage()
        }
      }}
    >
      <article className="mx-auto w-full max-w-[42rem] px-5 pt-6 pb-48 sm:px-10 sm:pt-10">
        <div className="mb-6 flex items-center justify-between gap-3 font-sans text-xs font-medium tracking-wide text-ink-3 uppercase">
          <span className="truncate">{p.chapterTitle ?? ''}</span>
          <span className="shrink-0 font-mono tabular">
            {p.pageIndex + 1} / {p.totalPages}
          </span>
        </div>
        <div className="reading text-ink" style={{ fontSize: p.fontSize, lineHeight: p.lineHeight }}>
          {p.page ? (
            <PageText
              page={p.page}
              activeSentence={p.activeSentence}
              selectedSentence={p.selectedSentence}
              flashSentence={p.flashSentence}
              marks={marks}
              onSentenceTap={p.onSentenceTap}
            />
          ) : (
            <div className="flex flex-col gap-3" aria-busy>
              {[92, 100, 86, 97, 74, 100, 90, 60].map((w, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-surface-2" style={{ width: `${w}%` }} />
              ))}
              <p className="mt-4 font-sans text-sm text-ink-3">Procesando esta página…</p>
            </div>
          )}
        </div>
        <nav className="mt-12 flex items-center justify-between gap-3 font-sans" aria-label="Paginación">
          <button
            onClick={p.onPrevPage}
            disabled={p.pageIndex === 0}
            className="flex h-11 items-center gap-1 rounded-full bg-surface-2 pr-4 pl-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-3 disabled:opacity-0"
          >
            <Icon.ChevronLeft size={18} /> Anterior
          </button>
          <button
            onClick={p.onNextPage}
            disabled={p.pageIndex >= p.totalPages - 1}
            className="flex h-11 items-center gap-1 rounded-full bg-surface-2 pr-3 pl-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3 disabled:opacity-0"
          >
            Siguiente <Icon.ChevronRight size={18} />
          </button>
        </nav>
      </article>
    </div>
  )
}
