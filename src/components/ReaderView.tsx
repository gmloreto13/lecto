import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bookmark, ReaderDocument, ReaderSettings, ReadingPosition } from '../types/document'
import { clampRate } from '../hooks/useSpeechReader'
import { pageSentenceCount, pageSentences } from '../utils/textSegmentation'
import { estimateMinutes, formatDuration } from '../utils/stats'
import type { SearchHit } from '../utils/search'
import { AudioDock, SleepSheet, SpeedSheet, type SleepTimer } from './AudioDock'
import { BookmarksPanel, NoteEditor } from './BookmarksPanel'
import { Icon } from './Icons'
import { ReaderViewport } from './ReaderViewport'
import { TocPanel } from './ReaderSidebar'
import { SearchPanel } from './SearchPanel'
import { AppearanceControls } from './SettingsView'
import { Sheet } from './Sheet'

export interface SpeechApi {
  supported: boolean
  isPlaying: boolean
  voices: SpeechSynthesisVoice[]
  voice: SpeechSynthesisVoice | null
  toggle: () => void
  step: (d: 1 | -1) => void
  jumpTo: (p: ReadingPosition, autoplay?: boolean) => void
  preview: (t: string) => void
  play: (from?: ReadingPosition) => void
}

type Panel = 'toc' | 'search' | 'bookmarks' | 'display' | 'speed' | 'sleep' | null

interface Props {
  doc: ReaderDocument
  position: ReadingPosition
  bookmarks: Bookmark[]
  settings: ReaderSettings
  onSettings: (patch: Partial<ReaderSettings>) => void
  speech: SpeechApi
  sleep: SleepTimer
  onSleep: (t: SleepTimer) => void
  onBack: () => void
  onCreateBookmark: (page: number, sentence: number, withNote: boolean) => Bookmark
  onSaveBookmark: (b: Bookmark) => void
  onDeleteBookmark: (b: Bookmark) => void
  onExportBookmarks: () => void
  onShortcuts: () => void
  onCycleTheme: () => void
  toast: (msg: string) => void
}

export function ReaderView(p: Props) {
  const { doc, position, speech } = p
  const [panel, setPanel] = useState<Panel>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const [editing, setEditing] = useState<Bookmark | null>(null)
  const [sidebar, setSidebar] = useState(true)
  const page = position.page
  const pageMarks = useMemo(() => p.bookmarks.filter((b) => b.page === page), [p.bookmarks, page])

  useEffect(() => setSelected(null), [page])
  useEffect(() => {
    if (flash === null) return
    const t = window.setTimeout(() => setFlash(null), 1700)
    return () => window.clearTimeout(t)
  }, [flash])

  const chapterTitle = useMemo(() => {
    let t: string | undefined
    for (const c of doc.chapters) if (c.page <= page) t = c.title
    return t
  }, [doc.chapters, page])

  // Caracteres acumulados por página para estimar el tiempo restante.
  const cumulative = useMemo(() => {
    const out = [0]
    for (const pg of doc.pages) out.push(out[out.length - 1] + pg.paragraphs.reduce((n, para) => n + para.reduce((m, s) => m + s.length, 0), 0))
    return out
  }, [doc.pages])

  const sentencesHere = pageSentenceCount(doc.pages[page])
  const progress = doc.totalPages ? (page + (sentencesHere ? position.sentence / sentencesHere : 0)) / doc.totalPages : 0
  const before = pageSentences(doc.pages[page]).slice(0, position.sentence).reduce((n, s) => n + s.length, 0)
  const remainingChars = Math.max(0, cumulative[cumulative.length - 1] - cumulative[page] - before)
  const remainingMin = estimateMinutes(remainingChars, p.settings.rate)
  const info = `Página ${page + 1} de ${doc.totalPages} · quedan ~${formatDuration(remainingMin * 60)}${doc.complete ? '' : '+'}`

  const goToPage = useCallback(
    (n: number) => {
      if (n < 0 || n >= doc.totalPages) return
      speech.jumpTo({ page: n, sentence: 0 })
    },
    [doc.totalPages, speech],
  )

  const onSentenceTap = useCallback((i: number) => setSelected((cur) => (cur === i ? null : i)), [])

  const selectedText = selected !== null ? pageSentences(doc.pages[page])[selected] : null
  const selectedMark = selected !== null ? pageMarks.find((b) => b.sentence === selected) : undefined

  const toggleMarkAt = useCallback(
    (sentence: number) => {
      const existing = p.bookmarks.find((b) => b.page === page && b.sentence === sentence)
      if (existing) {
        p.onDeleteBookmark(existing)
        p.toast('Marcador eliminado')
      } else {
        p.onCreateBookmark(page, sentence, false)
        p.toast('Frase marcada')
      }
    },
    [p, page],
  )

  const pickSearch = (hit: SearchHit) => {
    setPanel(null)
    speech.jumpTo({ page: hit.page, sentence: hit.sentence })
    setFlash(hit.sentence)
  }
  const jumpBookmark = (b: Bookmark) => {
    setPanel(null)
    speech.jumpTo({ page: b.page, sentence: b.sentence })
    setFlash(b.sentence)
  }

  // Atajos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"]') && e.key !== '?') return
      const rate = p.settings.rate
      switch (e.key) {
        case ' ':
          e.preventDefault()
          speech.toggle()
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) goToPage(page + 1)
          else speech.step(1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) goToPage(page - 1)
          else speech.step(-1)
          break
        case 'ArrowUp':
          e.preventDefault()
          p.onSettings({ rate: clampRate(rate + 0.1) })
          break
        case 'ArrowDown':
          e.preventDefault()
          p.onSettings({ rate: clampRate(rate - 0.1) })
          break
        case '1':
        case '2':
        case '3':
        case '4':
          p.onSettings({ rate: [1, 1.25, 1.5, 2][Number(e.key) - 1] })
          break
        case '/':
          e.preventDefault()
          setPanel('search')
          break
        case 'b':
        case 'B':
          toggleMarkAt(position.sentence)
          break
        case 't':
        case 'T':
          setPanel('toc')
          break
        case 'd':
        case 'D':
          p.onCycleTheme()
          break
        case '?':
          p.onShortcuts()
          break
        case 'Escape':
          setSelected(null)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p, speech, goToPage, page, position.sentence, toggleMarkAt])

  const headerBtn = (label: string, icon: React.ReactNode, onClick: () => void, extra = '', badge?: number) => (
    <button onClick={onClick} aria-label={label} title={label} className={`relative grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink ${extra}`}>
      {icon}
      {!!badge && <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] leading-4 text-accent-ink">{badge}</span>}
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1">
      {/* Panel lateral en pantallas grandes */}
      <aside className={`hidden shrink-0 overflow-y-auto border-r border-line bg-surface/50 p-5 transition-all lg:block ${sidebar ? 'w-80' : 'w-0 overflow-hidden border-0 p-0'}`}>
        {sidebar && (
          <>
            <p className="mb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">Índice</p>
            <h2 className="mb-4 line-clamp-2 font-serif text-lg leading-snug font-semibold text-ink">{doc.title}</h2>
            <TocPanel doc={doc} currentPage={page} bookmarks={p.bookmarks} onGoToPage={goToPage} />
          </>
        )}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex h-14 shrink-0 items-center gap-1 border-b border-line/70 bg-bg/85 px-2 pt-safe backdrop-blur-xl sm:px-4 md:pt-0">
          {headerBtn('Volver a la biblioteca', <Icon.ChevronLeft size={22} />, p.onBack, 'md:hidden')}
          {headerBtn(sidebar ? 'Ocultar índice' : 'Mostrar índice', <Icon.List />, () => setSidebar((s) => !s), 'hidden lg:grid')}
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-sm leading-tight font-bold text-ink">{doc.title}</p>
            <p className="truncate text-xs text-ink-3">{chapterTitle && chapterTitle !== doc.title ? chapterTitle : (doc.author ?? `${doc.totalPages} páginas`)}</p>
          </div>
          {headerBtn('Buscar', <Icon.Search />, () => setPanel('search'))}
          {headerBtn('Marcadores y notas', <Icon.Bookmark />, () => setPanel('bookmarks'), '', p.bookmarks.length)}
          {headerBtn('Índice', <Icon.List />, () => setPanel('toc'), 'lg:hidden')}
          {headerBtn('Apariencia', <Icon.Type />, () => setPanel('display'))}
        </header>

        <div className="min-h-0 flex-1">
          <ReaderViewport
            page={doc.pages[page]}
            pageIndex={page}
            totalPages={doc.totalPages}
            chapterTitle={chapterTitle}
            activeSentence={position.sentence}
            selectedSentence={selected}
            flashSentence={flash}
            bookmarks={pageMarks}
            fontSize={p.settings.fontSize}
            lineHeight={p.settings.lineHeight}
            autoScroll={p.settings.autoScroll}
            isPlaying={speech.isPlaying}
            onSentenceTap={onSentenceTap}
            onPrevPage={() => goToPage(page - 1)}
            onNextPage={() => goToPage(page + 1)}
          />
        </div>

        {/* Acciones sobre la frase seleccionada */}
        {selected !== null && selectedText && (
          <div className="animate-pop fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 sm:bottom-32">
            <div className="flex items-center gap-1 rounded-2xl bg-ink p-1.5 text-bg shadow-float">
              <button
                onClick={() => {
                  speech.jumpTo({ page, sentence: selected }, true)
                  setSelected(null)
                }}
                className="flex h-11 items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-semibold text-accent-ink"
              >
                <Icon.Play size={15} /> Escuchar
              </button>
              <button
                onClick={() => {
                  toggleMarkAt(selected)
                  setSelected(null)
                }}
                className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-current/10"
              >
                {selectedMark ? <Icon.BookmarkFill size={17} /> : <Icon.Bookmark size={17} />}
                <span className="hidden min-[380px]:inline">{selectedMark ? 'Quitar' : 'Marcar'}</span>
              </button>
              <button
                onClick={() => {
                  setEditing(selectedMark ?? p.onCreateBookmark(page, selected, true))
                  setSelected(null)
                }}
                className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-current/10"
              >
                <Icon.Note size={17} /> <span className="hidden min-[380px]:inline">Nota</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(selectedText).then(
                    () => p.toast('Frase copiada'),
                    () => p.toast('No se pudo copiar'),
                  )
                  setSelected(null)
                }}
                aria-label="Copiar frase"
                className="grid size-11 place-items-center rounded-xl hover:bg-current/10"
              >
                <Icon.Copy size={17} />
              </button>
              <button onClick={() => setSelected(null)} aria-label="Cerrar" className="grid size-11 place-items-center rounded-xl opacity-60 hover:bg-current/10">
                <Icon.X size={17} />
              </button>
            </div>
          </div>
        )}

        <AudioDock
          isPlaying={speech.isPlaying}
          supported={speech.supported}
          rate={p.settings.rate}
          progress={progress}
          info={info}
          sleep={p.sleep}
          onToggle={speech.toggle}
          onPrev={() => speech.step(-1)}
          onNext={() => speech.step(1)}
          onOpenSpeed={() => setPanel('speed')}
          onOpenSleep={() => setPanel('sleep')}
        />
      </div>

      <Sheet open={panel === 'toc'} onClose={() => setPanel(null)} title="Índice" subtitle={doc.title} tall>
        <TocPanel
          doc={doc}
          currentPage={page}
          bookmarks={p.bookmarks}
          onGoToPage={(n) => {
            goToPage(n)
            setPanel(null)
          }}
        />
      </Sheet>
      <Sheet open={panel === 'search'} onClose={() => setPanel(null)} title="Buscar" subtitle={doc.title} tall>
        <SearchPanel doc={doc} onPick={pickSearch} />
      </Sheet>
      <Sheet open={panel === 'bookmarks'} onClose={() => setPanel(null)} title="Marcadores y notas" subtitle={doc.title} tall>
        <BookmarksPanel
          bookmarks={p.bookmarks}
          onJump={jumpBookmark}
          onEdit={(b) => {
            setPanel(null)
            setEditing(b)
          }}
          onDelete={p.onDeleteBookmark}
          onExport={p.onExportBookmarks}
        />
      </Sheet>
      <Sheet open={panel === 'display'} onClose={() => setPanel(null)} title="Apariencia">
        <AppearanceControls settings={p.settings} onChange={p.onSettings} />
      </Sheet>
      <SpeedSheet
        open={panel === 'speed'}
        onClose={() => setPanel(null)}
        rate={p.settings.rate}
        onRate={(rate) => p.onSettings({ rate })}
        voices={speech.voices}
        voiceURI={speech.voice?.voiceURI ?? null}
        onVoice={(voiceURI) => p.onSettings({ voiceURI })}
        onPreview={() => speech.preview('Hola, así suena esta voz a la velocidad elegida.')}
      />
      <SleepSheet open={panel === 'sleep'} onClose={() => setPanel(null)} timer={p.sleep} onSet={p.onSleep} hasChapters={doc.chapters.length > 1} />
      <NoteEditor
        bookmark={editing}
        onClose={() => setEditing(null)}
        onSave={(b) => {
          p.onSaveBookmark(b)
          setEditing(null)
          p.toast(b.note ? 'Nota guardada' : 'Marcador guardado')
        }}
        onDelete={(b) => {
          p.onDeleteBookmark(b)
          setEditing(null)
        }}
      />
    </div>
  )
}
