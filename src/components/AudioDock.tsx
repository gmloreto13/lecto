import { useEffect, useState } from 'react'
import { MAX_RATE, MIN_RATE, clampRate } from '../hooks/useSpeechReader'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

export type SleepTimer = { kind: 'minutes'; minutes: number; endsAt: number } | { kind: 'chapter' } | { kind: 'page' } | null

const PRESETS = [1, 1.25, 1.5, 1.75, 2]

export function fmtRate(r: number) {
  return r.toFixed(Math.round(r * 100) % 10 === 0 ? 1 : 2).replace('.', ',') + '×'
}

function useCountdown(timer: SleepTimer) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (timer?.kind !== 'minutes') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer])
  if (timer?.kind !== 'minutes') return null
  const left = Math.max(0, Math.round((timer.endsAt - now) / 1000))
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

interface DockProps {
  isPlaying: boolean
  supported: boolean
  rate: number
  progress: number
  info: string
  sleep: SleepTimer
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onOpenSpeed: () => void
  onOpenSleep: () => void
}

export function AudioDock(p: DockProps) {
  const countdown = useCountdown(p.sleep)
  const sleepLabel = p.sleep ? (p.sleep.kind === 'minutes' ? countdown : p.sleep.kind === 'chapter' ? 'Cap.' : 'Pág.') : null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
      <div className="pointer-events-auto mx-auto max-w-2xl overflow-hidden rounded-[26px] border border-line bg-surface/92 shadow-float backdrop-blur-xl supports-[backdrop-filter]:bg-surface/80">
        <div className="h-[3px] bg-surface-3" aria-hidden>
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${p.progress * 100}%` }} />
        </div>
        <div className="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3">
          <button
            onClick={p.onOpenSleep}
            aria-label="Temporizador de sueño"
            className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 transition ${
              p.sleep ? 'bg-accent-soft text-accent-text' : 'text-ink-2 hover:bg-surface-2'
            }`}
          >
            <Icon.Moon size={19} />
            {sleepLabel && <span className="font-mono text-xs font-medium tabular">{sleepLabel}</span>}
          </button>
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-xs text-ink-3">{p.info}</p>
          </div>
          <div className="flex flex-1 items-center justify-center gap-1 sm:flex-none sm:gap-2">
            <button onClick={p.onPrev} aria-label="Oración anterior" className="grid size-12 place-items-center rounded-full text-ink transition hover:bg-surface-2 active:scale-95">
              <Icon.Prev size={20} />
            </button>
            <button
              onClick={p.onToggle}
              disabled={!p.supported}
              aria-label={p.isPlaying ? 'Pausar' : 'Reproducir'}
              className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-soft transition hover:brightness-105 active:scale-95 disabled:opacity-40"
            >
              {p.isPlaying ? <Icon.Pause size={24} /> : <Icon.Play size={24} className="translate-x-[1px]" />}
            </button>
            <button onClick={p.onNext} aria-label="Oración siguiente" className="grid size-12 place-items-center rounded-full text-ink transition hover:bg-surface-2 active:scale-95">
              <Icon.Next size={20} />
            </button>
          </div>
          <div className="hidden flex-1 sm:block" />
          <button
            onClick={p.onOpenSpeed}
            aria-label={`Velocidad ${fmtRate(p.rate)}. Cambiar velocidad y voz`}
            className="h-11 min-w-[4.25rem] rounded-full bg-surface-2 px-3 font-mono text-sm font-medium text-ink transition hover:bg-surface-3"
          >
            {fmtRate(p.rate)}
          </button>
        </div>
        <p className="truncate px-4 pb-2 text-center text-[11px] text-ink-3 sm:hidden">{p.supported ? p.info : 'Tu navegador no admite lectura en voz alta.'}</p>
      </div>
    </div>
  )
}

interface SpeedProps {
  open: boolean
  onClose: () => void
  rate: number
  onRate: (r: number) => void
  voices: SpeechSynthesisVoice[]
  voiceURI: string | null
  onVoice: (uri: string) => void
  onPreview: () => void
}

export function SpeedSheet(p: SpeedProps) {
  const [showAll, setShowAll] = useState(false)
  const spanish = p.voices.filter((v) => v.lang.toLowerCase().startsWith('es'))
  const list = showAll || spanish.length === 0 ? p.voices : spanish
  const fill = ((p.rate - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100
  return (
    <Sheet open={p.open} onClose={p.onClose} title="Velocidad y voz" subtitle="Los cambios se aplican al instante">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => p.onRate(clampRate(p.rate - 0.1))}
          aria-label="Reducir 0,1×"
          className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink transition hover:bg-surface-3 active:scale-95"
        >
          <Icon.Minus />
        </button>
        <div className="text-center">
          <p className="font-mono text-5xl font-medium tracking-tight text-ink tabular">{fmtRate(p.rate)}</p>
          <p className="mt-1 text-xs text-ink-3">≈ {Math.round(150 * p.rate)} palabras por minuto</p>
        </div>
        <button
          onClick={() => p.onRate(clampRate(p.rate + 0.1))}
          aria-label="Aumentar 0,1×"
          className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink transition hover:bg-surface-3 active:scale-95"
        >
          <Icon.Plus />
        </button>
      </div>
      <input
        type="range"
        min={MIN_RATE}
        max={MAX_RATE}
        step={0.05}
        value={p.rate}
        onChange={(e) => p.onRate(Math.round(parseFloat(e.target.value) * 20) / 20)}
        className="speed-slider mt-5"
        style={{ ['--fill' as string]: `${fill}%` }}
        aria-label="Velocidad de lectura"
      />
      <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-3">
        <span>0,5×</span>
        <span>3,0×</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {PRESETS.map((r) => (
          <button
            key={r}
            onClick={() => p.onRate(r)}
            className={`h-11 rounded-xl font-mono text-sm transition ${
              Math.abs(p.rate - r) < 0.01 ? 'bg-ink font-medium text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
            }`}
          >
            {fmtRate(r)}
          </button>
        ))}
      </div>

      <div className="mt-7 mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Voz</h3>
        <button onClick={p.onPreview} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-text">
          <Icon.Speak size={14} /> Probar
        </button>
      </div>
      {p.voices.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm text-ink-2">No se encontraron voces. En el móvil, revisa que haya una voz en español instalada en los ajustes de texto a voz del sistema.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {list.map((v) => {
            const active = v.voiceURI === p.voiceURI
            return (
              <li key={v.voiceURI}>
                <button
                  onClick={() => p.onVoice(v.voiceURI)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2 ${active ? 'bg-accent-soft' : ''}`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
                    {active && <Icon.Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{v.name.replace(/^(Microsoft|Google)\s/, '')}</span>
                    <span className="block font-mono text-[11px] text-ink-3">
                      {v.lang}
                      {v.localService ? ' · sin conexión' : ' · en línea'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {spanish.length > 0 && spanish.length < p.voices.length && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-accent-text">
          {showAll ? 'Mostrar solo voces en español' : `Ver todas las voces (${p.voices.length})`}
        </button>
      )}
    </Sheet>
  )
}

interface SleepProps {
  open: boolean
  onClose: () => void
  timer: SleepTimer
  onSet: (t: SleepTimer) => void
  hasChapters: boolean
}

export function SleepSheet(p: SleepProps) {
  const countdown = useCountdown(p.timer)
  const choose = (t: SleepTimer) => {
    p.onSet(t)
    p.onClose()
  }
  const opt = (label: string, active: boolean, onClick: () => void, sub?: string) => (
    <button
      onClick={onClick}
      className={`flex h-14 items-center justify-between rounded-2xl px-4 text-left transition ${active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink hover:bg-surface-3'}`}
    >
      <span className="font-semibold">{label}</span>
      {sub && <span className={`text-xs ${active ? 'opacity-80' : 'text-ink-3'}`}>{sub}</span>}
    </button>
  )
  return (
    <Sheet open={p.open} onClose={p.onClose} title="Temporizador de sueño" subtitle={p.timer ? 'La lectura se detendrá sola' : 'Detén la lectura automáticamente'}>
      {p.timer?.kind === 'minutes' && (
        <div className="mb-5 rounded-3xl bg-ink p-5 text-center text-bg">
          <p className="text-xs font-semibold tracking-wider uppercase opacity-60">Se detendrá en</p>
          <p className="mt-1 font-mono text-5xl font-medium tabular">{countdown}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[5, 15, 30, 45, 60, 90].map((m) => (
          <button
            key={m}
            onClick={() => choose({ kind: 'minutes', minutes: m, endsAt: Date.now() + m * 60_000 })}
            className={`h-16 rounded-2xl transition ${
              p.timer?.kind === 'minutes' && p.timer.minutes === m ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink hover:bg-surface-3'
            }`}
          >
            <span className="block font-mono text-xl font-medium">{m}</span>
            <span className="block text-[11px] opacity-70">min</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-2">
        {opt('Al terminar la página', p.timer?.kind === 'page', () => choose({ kind: 'page' }))}
        {p.hasChapters && opt('Al terminar el capítulo', p.timer?.kind === 'chapter', () => choose({ kind: 'chapter' }))}
        {p.timer && (
          <button onClick={() => choose(null)} className="mt-2 h-12 rounded-2xl border border-line font-semibold text-ink-2 transition hover:bg-surface-2">
            Desactivar temporizador
          </button>
        )}
      </div>
    </Sheet>
  )
}
