import { useRef, useState } from 'react'
import type { DocumentMeta, ParseProgress, ReaderDocument, ReadingStats } from '../types/document'
import { ACCEPT_ATTR } from '../parsers'
import { dayKey, formatDuration, streak } from '../utils/stats'
import { Cover } from './Cover'
import { Icon } from './Icons'

interface Props {
  docs: DocumentMeta[]
  samples: ReaderDocument[]
  progress: ParseProgress | null
  error: string | null
  stats: ReadingStats
  canInstall: boolean
  onInstall: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onFiles: (files: FileList | File[]) => void
  onDismissError: () => void
}

function percent(m: DocumentMeta) {
  if (!m.totalPages) return 0
  return Math.min(100, Math.round(((m.position.page + (m.position.sentence > 0 ? 0.5 : 0)) / m.totalPages) * 100))
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function LibraryView(p: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const sorted = [...p.docs].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
  const recent = sorted[0]
  const own = sorted.filter((m) => m.format !== 'sample')
  const today = p.stats.days[dayKey()]?.seconds ?? 0
  const goal = p.stats.goalMinutes * 60
  const ring = Math.min(1, today / Math.max(goal, 1))
  const days = streak(p.stats)
  const busy = p.progress && (p.progress.stage === 'reading' || p.progress.stage === 'parsing')

  const pick = () => inputRef.current?.click()

  return (
    <div
      className="mx-auto w-full max-w-5xl px-4 pt-4 pb-32 sm:px-8 sm:pt-8"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) p.onFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) p.onFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Saludo + meta diaria */}
      <section className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-3">{greeting()}</p>
          <h1 className="mt-0.5 text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">Tu biblioteca</h1>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-soft" title="Meta diaria">
          <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden>
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-3)" strokeWidth="5" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${ring * 100.5} 100.5`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="leading-tight">
            <p className="font-mono text-sm font-medium text-ink tabular">
              {Math.floor(today / 60)}/{p.stats.goalMinutes} min
            </p>
            <p className="flex items-center gap-1 text-xs text-ink-3">
              <Icon.Flame size={12} className={days ? 'text-accent' : ''} /> {days} {days === 1 ? 'día' : 'días'}
            </p>
          </div>
        </div>
      </section>

      {p.error && (
        <div className="animate-pop mt-5 flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-accent-soft p-4 text-sm text-accent-text">
          <p className="flex-1">{p.error}</p>
          <button onClick={p.onDismissError} aria-label="Cerrar aviso" className="shrink-0">
            <Icon.X size={16} />
          </button>
        </div>
      )}

      {p.progress && p.progress.stage !== 'done' && p.progress.stage !== 'error' && (
        <div className="animate-pop mt-5 rounded-2xl bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="truncate font-semibold text-ink">{p.progress.fileName}</p>
            <p className="shrink-0 font-mono text-xs text-ink-3 tabular">
              {p.progress.stage === 'reading' ? 'Abriendo…' : `${p.progress.loaded}/${p.progress.total}`}
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${p.progress.total ? Math.max(4, (p.progress.loaded / p.progress.total) * 100) : 4}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {p.progress.stage === 'background' ? 'Ya puedes escuchar. Seguimos procesando el resto en segundo plano.' : 'Preparando las primeras páginas…'}
          </p>
        </div>
      )}

      {/* Continuar */}
      {recent && (
        <button
          onClick={() => p.onOpen(recent.id)}
          className="group mt-6 flex w-full items-center gap-4 rounded-3xl bg-ink p-4 text-left text-bg shadow-float transition active:scale-[0.99] sm:p-5"
        >
          <Cover title={recent.title} hue={recent.hue} format={recent.format} className="w-16 shrink-0 sm:w-20" small />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider uppercase opacity-60">Continuar escuchando</p>
            <p className="mt-1 line-clamp-2 font-serif text-lg leading-snug font-semibold">{recent.title}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-current/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent(recent)}%` }} />
              </div>
              <span className="font-mono text-xs opacity-70 tabular">
                pág. {recent.position.page + 1}/{recent.totalPages}
              </span>
            </div>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition group-hover:scale-105">
            <Icon.Play size={20} />
          </span>
        </button>
      )}

      {/* Zona de carga */}
      <button
        onClick={pick}
        disabled={!!busy}
        className={`mt-6 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed p-5 text-left transition sm:p-6 ${
          dragging ? 'border-accent bg-accent-soft' : 'border-line bg-surface/60 hover:border-ink-3'
        } ${own.length ? '' : 'sm:py-10'}`}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text">
          <Icon.Upload size={22} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{dragging ? 'Suelta el archivo aquí' : 'Añadir un documento'}</span>
          <span className="mt-0.5 block text-sm text-ink-3">PDF, EPUB, TXT o Markdown · hasta 1.000 páginas</span>
        </span>
      </button>

      {/* Documentos */}
      {own.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold text-ink">Mis documentos</h2>
            <span className="font-mono text-xs text-ink-3">{own.length}</span>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {own.map((m) => (
              <li key={m.id} className="group relative">
                <button onClick={() => p.onOpen(m.id)} className="block w-full text-left transition active:scale-[0.98]">
                  <Cover title={m.title} hue={m.hue} format={m.format} className="w-full transition group-hover:-translate-y-0.5 group-hover:shadow-float" />
                  <p className="mt-2.5 line-clamp-2 text-sm leading-snug font-semibold text-ink">{m.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percent(m)}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-ink-3 tabular">{percent(m)}%</span>
                  </div>
                  {p.stats.perDoc[m.id] && <p className="mt-1 text-[11px] text-ink-3">{formatDuration(p.stats.perDoc[m.id].seconds)} escuchados</p>}
                </button>
                {confirmDelete === m.id ? (
                  <div className="animate-pop absolute inset-x-1 top-1 rounded-xl bg-surface p-2 text-center shadow-float">
                    <p className="text-xs font-semibold text-ink">¿Eliminar?</p>
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => setConfirmDelete(null)} className="h-8 flex-1 rounded-lg bg-surface-2 text-xs font-semibold text-ink-2">
                        No
                      </button>
                      <button
                        onClick={() => {
                          p.onDelete(m.id)
                          setConfirmDelete(null)
                        }}
                        className="h-8 flex-1 rounded-lg bg-accent text-xs font-semibold text-accent-ink"
                      >
                        Sí
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(m.id)}
                    aria-label={`Eliminar ${m.title}`}
                    className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/30 text-white opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  >
                    <Icon.Trash size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ejemplos */}
      <section className="mt-10">
        <h2 className="mb-1 text-base font-bold text-ink">Para empezar</h2>
        <p className="mb-4 text-sm text-ink-3">Textos de prueba para descubrir la lectura en voz alta y el cambio de velocidad al instante.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {p.samples.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => p.onOpen(s.id)}
                className="flex w-full items-center gap-4 rounded-2xl bg-surface p-3 text-left shadow-soft transition hover:shadow-float active:scale-[0.99]"
              >
                <Cover title={s.title} hue={s.hue} format="sample" className="w-12 shrink-0" small />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{s.title}</p>
                  <p className="text-sm text-ink-3">
                    {s.author} · {s.pages.length} págs.
                  </p>
                </div>
                <Icon.ChevronRight className="text-ink-3" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {p.canInstall && (
        <section className="mt-6 flex items-center gap-4 rounded-2xl bg-accent-soft p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-accent-text">
            <Icon.Phone />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Instala Lecto en tu móvil</p>
            <p className="text-sm text-ink-2">Ábrela desde la pantalla de inicio y úsala sin conexión.</p>
          </div>
          <button onClick={p.onInstall} className="h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
            Instalar
          </button>
        </section>
      )}
    </div>
  )
}
