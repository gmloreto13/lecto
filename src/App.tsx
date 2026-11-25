import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bookmark, DocumentMeta, ParseProgress, PronunciationRule, ReaderDocument, ReaderSettings, ReadingPosition, ReadingStats, ThemeName } from './types/document'
import { SAMPLE_DOCUMENTS } from './data/sampleDocuments'
import { ACCEPT_ATTR, isSupported, parseFile } from './parsers'
import { db, metaFromDoc, prefs } from './utils/storage'
import { DEFAULT_RULES } from './utils/pronunciation'
import { addToStats } from './utils/stats'
import { pageSentences } from './utils/textSegmentation'
import { useSpeechReader } from './hooks/useSpeechReader'
import type { SleepTimer } from './components/AudioDock'
import { LibraryView } from './components/LibraryView'
import { ReaderView } from './components/ReaderView'
import { SettingsView } from './components/SettingsView'
import { ShortcutsModal } from './components/ShortcutsModal'
import { StatsView } from './components/StatsView'
import { BottomNav, TopBar, type View } from './components/TopBar'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const THEME_COLORS: Record<ThemeName, string> = { light: '#f5f2ec', sepia: '#efe4cf', dark: '#121110' }

function useResolvedTheme(theme: ReaderSettings['theme']): ThemeName {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

export default function App() {
  const [settings, setSettings] = useState<ReaderSettings>(prefs.loadSettings)
  const [rules, setRules] = useState<PronunciationRule[]>(() => prefs.loadRules(DEFAULT_RULES))
  const [stats, setStats] = useState<ReadingStats>(prefs.loadStats)
  const [metas, setMetas] = useState<DocumentMeta[]>([])
  const [doc, setDoc] = useState<ReaderDocument | null>(null)
  const [position, setPosition] = useState<ReadingPosition>({ page: 0, sentence: 0 })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [view, setView] = useState<View>('library')
  const [progress, setProgress] = useState<ParseProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sleep, setSleep] = useState<SleepTimer>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false)
  const fileInput = useRef<HTMLInputElement>(null)
  const docRef = useRef(doc)
  docRef.current = doc

  const theme = useResolvedTheme(settings.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLORS[theme]))
  }, [theme])

  // ---------- persistencia ----------
  useEffect(() => prefs.saveSettings(settings), [settings])
  useEffect(() => prefs.saveRules(rules), [rules])
  useEffect(() => {
    const t = window.setTimeout(() => prefs.saveStats(stats), 1500)
    return () => window.clearTimeout(t)
  }, [stats])
  useEffect(() => {
    const flush = () => prefs.saveStats(stats)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [stats])

  useEffect(() => {
    db.listMeta().then(setMetas)
  }, [])

  useEffect(() => {
    if (!doc) return
    const t = window.setTimeout(() => {
      db.updatePosition(doc.id, position)
      setMetas((ms) => ms.map((m) => (m.id === doc.id ? { ...m, position, lastOpenedAt: Date.now() } : m)))
    }, 700)
    return () => window.clearTimeout(t)
  }, [doc, position])

  const toast = useCallback((msg: string) => setToastMsg(msg), [])
  useEffect(() => {
    if (!toastMsg) return
    const t = window.setTimeout(() => setToastMsg(null), toastMsg.length > 60 ? 7000 : 2000)
    return () => window.clearTimeout(t)
  }, [toastMsg])

  // ---------- PWA ----------
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const install = async () => {
    if (!installEvt) return
    await installEvt.prompt()
    setInstallEvt(null)
  }

  // ---------- temporizador de sueño ----------
  const sleepRef = useRef(sleep)
  sleepRef.current = sleep
  const canAdvance = useCallback((from: ReadingPosition, to: ReadingPosition) => {
    const s = sleepRef.current
    const d = docRef.current
    if (!s || from.page === to.page) return true
    if (s.kind === 'page' || (s.kind === 'chapter' && d?.chapters.some((c) => c.page === to.page))) {
      setSleep(null)
      setToastMsg('Temporizador: lectura detenida')
      return false
    }
    return true
  }, [])

  // ---------- voz ----------
  const getSentences = useCallback((page: number) => {
    const d = docRef.current
    return d && d.pages[page] ? pageSentences(d.pages[page]) : null
  }, [])

  const speech = useSpeechReader({
    position,
    onPosition: setPosition,
    getSentences,
    pageCount: doc?.totalPages ?? 0,
    loading: !!doc && !doc.complete,
    rate: settings.rate,
    voiceURI: settings.voiceURI,
    rules,
    canAdvance,
    onSentenceSpoken: (seconds) => setStats((s) => addToStats(s, docRef.current?.id ?? null, { seconds: Math.min(seconds, 60), sentences: 1 })),
    onPageFinished: () => setStats((s) => addToStats(s, docRef.current?.id ?? null, { pages: 1 })),
    onFinished: () => setToastMsg('Has llegado al final del documento'),
    onBlocked: (reason) =>
      setToastMsg(
        reason === 'not-allowed'
          ? 'El navegador bloqueó la voz. Toca de nuevo el botón de reproducir.'
          : 'No se oye la voz: sube el volumen, quita el modo silencio y revisa que haya una voz en español instalada en tu móvil.',
      ),
  })
  const { pause, isPlaying, toggle, step } = speech

  useEffect(() => {
    if (sleep?.kind !== 'minutes') return
    const id = window.setInterval(() => {
      if (Date.now() >= sleep.endsAt) {
        pause()
        setSleep(null)
        setToastMsg('Temporizador: lectura detenida')
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [sleep, pause])

  // Mantener la pantalla encendida mientras se escucha (evita que el móvil corte la voz).
  useEffect(() => {
    if (!isPlaying || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release()
          else lock = l
        })
        .catch(() => {})
    acquire()
    const onVis = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [isPlaying])

  // Controles en la pantalla de bloqueo / auriculares.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !doc) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: doc.title, artist: doc.author ?? 'Lecto', album: 'Lecto' })
      navigator.mediaSession.setActionHandler('play', () => toggle())
      navigator.mediaSession.setActionHandler('pause', () => pause())
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1))
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1))
    } catch {
      /* no soportado */
    }
  }, [doc, toggle, pause, step])
  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // ---------- documentos ----------
  const loadBookmarks = useCallback((id: string) => db.listBookmarks(id).then(setBookmarks), [])

  const openDocument = useCallback(
    async (id: string) => {
      pause()
      let d: ReaderDocument | undefined = SAMPLE_DOCUMENTS.find((s) => s.id === id)
      if (!d) d = await db.getDocument(id)
      if (!d) {
        setError('No se pudo abrir el documento. Puede que el almacenamiento del navegador se haya borrado.')
        return
      }
      const meta = metas.find((m) => m.id === id)
      const pos = meta?.position ?? { page: 0, sentence: 0 }
      setDoc(d)
      setPosition({ page: Math.min(pos.page, d.pages.length - 1), sentence: pos.sentence })
      setSleep(null)
      setView('reader')
      loadBookmarks(id)
      const nm = { ...(meta ?? metaFromDoc(d)), lastOpenedAt: Date.now() }
      db.saveMeta(nm)
      setMetas((ms) => [...ms.filter((m) => m.id !== id), nm])
    },
    [metas, pause, loadBookmarks],
  )

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      const bad = list.filter((f) => !isSupported(f))
      if (bad.length) setError(`Formato no compatible: ${bad.map((f) => f.name).join(', ')}. Usa PDF, EPUB, TXT o Markdown.`)
      for (const file of list.filter(isSupported)) {
        setError(null)
        let savedPages = 0
        try {
          await parseFile(file, {
            onProgress: setProgress,
            onReady: (d) => {
              pause()
              const meta = metaFromDoc(d)
              db.saveDocument(d)
              db.saveMeta(meta)
              savedPages = d.pages.length
              setMetas((ms) => [...ms.filter((m) => m.id !== d.id), meta])
              setDoc(d)
              setBookmarks([])
              setPosition({ page: 0, sentence: 0 })
              setView('reader')
            },
            onUpdate: (d) => {
              if (docRef.current?.id === d.id) setDoc((cur) => (cur ? { ...d, title: cur.title } : d))
              if (d.complete || d.pages.length - savedPages >= 100) {
                savedPages = d.pages.length
                db.saveDocument(d)
              }
              setMetas((ms) => ms.map((m) => (m.id === d.id ? { ...m, loadedPages: d.pages.length, complete: d.complete, totalPages: d.totalPages } : m)))
              if (d.complete) db.listMeta().then((all) => {
                const m = all.find((x) => x.id === d.id)
                if (m) db.saveMeta({ ...m, loadedPages: d.pages.length, complete: true, totalPages: d.totalPages })
              })
            },
          })
        } catch (e) {
          console.error(e)
          setProgress(null)
          setError(`No se pudo leer «${file.name}». ${e instanceof Error ? e.message : ''}`)
        }
      }
      window.setTimeout(() => setProgress((p) => (p?.stage === 'done' ? null : p)), 1200)
    },
    [pause],
  )

  const deleteDocument = useCallback(
    async (id: string) => {
      if (doc?.id === id) {
        pause()
        setDoc(null)
      }
      await db.deleteDocument(id)
      setMetas((ms) => ms.filter((m) => m.id !== id))
      toast('Documento eliminado')
    },
    [doc, pause, toast],
  )

  // ---------- marcadores ----------
  const createBookmark = useCallback(
    (page: number, sentence: number): Bookmark => {
      const d = docRef.current!
      const b: Bookmark = {
        id: 'bm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        docId: d.id,
        page,
        sentence,
        text: pageSentences(d.pages[page])[sentence] ?? '',
        note: '',
        color: 'amber',
        createdAt: Date.now(),
      }
      db.saveBookmark(b)
      setBookmarks((bs) => [...bs, b].sort((a, c) => a.page - c.page || a.sentence - c.sentence))
      return b
    },
    [],
  )
  const saveBookmark = useCallback((b: Bookmark) => {
    db.saveBookmark(b)
    setBookmarks((bs) => bs.map((x) => (x.id === b.id ? b : x)))
  }, [])
  const deleteBookmark = useCallback((b: Bookmark) => {
    db.deleteBookmark(b.id)
    setBookmarks((bs) => bs.filter((x) => x.id !== b.id))
  }, [])
  const exportBookmarks = useCallback(() => {
    const d = docRef.current
    if (!d) return
    const lines = [`# ${d.title}`, '', `Marcadores y notas exportados desde Lecto · ${new Date().toLocaleDateString('es')}`, '']
    for (const b of bookmarks) {
      lines.push(`> ${b.text}`, '', `— Página ${b.page + 1}`)
      if (b.note) lines.push('', b.note)
      lines.push('', '---', '')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${d.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || 'notas'} - notas.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }, [bookmarks])

  // ---------- ajustes ----------
  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const cycleTheme = useCallback(() => {
    const order: ThemeName[] = ['light', 'sepia', 'dark']
    setSettings((s) => ({ ...s, theme: order[(order.indexOf(theme) + 1) % order.length] }))
  }, [theme])

  // Atajo global de ayuda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === '?' && view !== 'reader') setShortcuts(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const goView = (v: View) => {
    if (v === 'reader' && !doc) return
    setView(v)
    window.scrollTo({ top: 0 })
  }

  const upload = () => fileInput.current?.click()

  return (
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className={view === 'reader' ? 'hidden md:block' : ''}>
        <TopBar view={view} onView={goView} onUpload={upload} hasDoc={!!doc} />
      </div>

      {view === 'reader' && doc ? (
        <ReaderView
          doc={doc}
          position={position}
          bookmarks={bookmarks}
          settings={settings}
          onSettings={updateSettings}
          speech={speech}
          sleep={sleep}
          onSleep={setSleep}
          onBack={() => setView('library')}
          onCreateBookmark={createBookmark}
          onSaveBookmark={saveBookmark}
          onDeleteBookmark={deleteBookmark}
          onExportBookmarks={exportBookmarks}
          onShortcuts={() => setShortcuts(true)}
          onCycleTheme={cycleTheme}
          toast={toast}
        />
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          {view === 'stats' ? (
            <StatsView stats={stats} docs={metas} onGoal={(goalMinutes) => setStats((s) => ({ ...s, goalMinutes }))} onOpen={openDocument} />
          ) : view === 'settings' ? (
            <SettingsView
              settings={settings}
              onSettings={updateSettings}
              rules={rules}
              onRules={setRules}
              onPreview={speech.preview}
              onShortcuts={() => setShortcuts(true)}
              canInstall={!!installEvt}
              installed={installed}
              onInstall={install}
            />
          ) : (
            <LibraryView
              docs={metas}
              samples={SAMPLE_DOCUMENTS}
              progress={progress}
              error={error}
              stats={stats}
              canInstall={!!installEvt && !installed}
              onInstall={install}
              onOpen={openDocument}
              onDelete={deleteDocument}
              onFiles={handleFiles}
              onDismissError={() => setError(null)}
            />
          )}
        </main>
      )}

      {/* Mini reproductor fuera del lector */}
      {view !== 'reader' && doc && isPlaying && (
        <button
          onClick={() => setView('reader')}
          className="animate-pop fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl bg-ink p-2 pr-3 text-left text-bg shadow-float md:inset-x-auto md:right-6 md:bottom-6 md:w-80"
        >
          <span className="flex h-10 w-10 items-end justify-center gap-[3px] rounded-xl bg-accent p-2.5" aria-hidden>
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="eq-bar h-full w-1 rounded-full bg-accent-ink" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{doc.title}</span>
            <span className="block text-xs opacity-60">Escuchando · pág. {position.page + 1}</span>
          </span>
          <span
            role="button"
            aria-label="Pausar"
            onClick={(e) => {
              e.stopPropagation()
              pause()
            }}
            className="grid size-9 place-items-center rounded-full bg-current/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="5" y="4" width="5" height="16" rx="1.5" />
              <rect x="14" y="4" width="5" height="16" rx="1.5" />
            </svg>
          </span>
        </button>
      )}

      {view !== 'reader' && <BottomNav view={view} onView={goView} hasDoc={!!doc} />}

      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />

      {toastMsg && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-[60] flex justify-center px-4" role="status">
          <p className="animate-pop max-w-md rounded-2xl bg-ink px-4 py-2.5 text-center text-sm font-semibold text-bg shadow-float">{toastMsg}</p>
        </div>
      )}
    </div>
  )
}
