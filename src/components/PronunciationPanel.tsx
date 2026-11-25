import { useState } from 'react'
import type { PronunciationRule } from '../types/document'
import { DEFAULT_RULES, applyPronunciation, newRule } from '../utils/pronunciation'
import { Icon } from './Icons'
import { Toggle } from './Sheet'

interface Props {
  rules: PronunciationRule[]
  onChange: (rules: PronunciationRule[]) => void
  onPreview: (text: string) => void
}

export function PronunciationPanel({ rules, onChange, onPreview }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [sample, setSample] = useState('El Dr. Pérez trabaja en la ONU desde 2019, etc.')

  const add = () => {
    if (!from.trim() || !to.trim()) return
    onChange([newRule(from.trim(), to.trim()), ...rules])
    setFrom('')
    setTo('')
  }
  const update = (id: string, patch: Partial<PronunciationRule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="rounded-2xl bg-surface-2 p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Texto escrito (p. ej. ONU)"
            className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            aria-label="Texto escrito"
          />
          <Icon.ChevronRight className="hidden shrink-0 text-ink-3 sm:block" />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Cómo debe sonar (o ene u)"
            className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            aria-label="Pronunciación"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!to.trim()}
            onClick={() => onPreview(to)}
            className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-surface-3 disabled:opacity-40"
          >
            <Icon.Speak size={16} /> Escuchar
          </button>
          <button type="submit" disabled={!from.trim() || !to.trim()} className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-ink disabled:opacity-40">
            Añadir regla
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-line p-3">
        <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Probar con una frase</p>
        <input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl bg-surface-2 px-3 text-sm text-ink outline-none"
          aria-label="Frase de prueba"
        />
        <p className="mt-2 text-sm text-ink-2">
          <span className="text-ink-3">Se leerá: </span>
          {applyPronunciation(sample, rules)}
        </p>
        <button onClick={() => onPreview(sample)} className="mt-2 flex h-10 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent-text">
          <Icon.Speak size={15} /> Escuchar frase
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rules.map((r) =>
          editing === r.id ? (
            <li key={r.id} className="flex flex-col gap-2 bg-surface-2 p-3">
              <div className="flex gap-2">
                <input value={r.from} onChange={(e) => update(r.id, { from: e.target.value })} className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-3 text-base text-ink outline-none" aria-label="Texto escrito" />
                <input value={r.to} onChange={(e) => update(r.id, { to: e.target.value })} className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-3 text-base text-ink outline-none" aria-label="Pronunciación" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={r.wholeWord} onChange={(e) => update(r.id, { wholeWord: e.target.checked })} className="size-4 accent-[var(--accent)]" />
                  Palabra completa
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={r.caseSensitive} onChange={(e) => update(r.id, { caseSensitive: e.target.checked })} className="size-4 accent-[var(--accent)]" />
                  Distinguir mayúsculas
                </label>
                <span className="flex-1" />
                <button onClick={() => onChange(rules.filter((x) => x.id !== r.id))} className="h-9 rounded-full px-3 font-semibold text-accent-text">
                  Eliminar
                </button>
                <button onClick={() => setEditing(null)} className="h-9 rounded-full bg-ink px-4 font-semibold text-bg">
                  Listo
                </button>
              </div>
            </li>
          ) : (
            <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 ${r.enabled ? '' : 'opacity-50'}`}>
              <button onClick={() => setEditing(r.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-sm text-ink">{r.from}</span>
                <Icon.ChevronRight size={14} className="shrink-0 text-ink-3" />
                <span className="truncate text-sm text-ink-2">{r.to}</span>
              </button>
              <button onClick={() => onPreview(r.to)} aria-label={`Escuchar ${r.to}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                <Icon.Speak size={16} />
              </button>
              <Toggle checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} label={`Activar ${r.from}`} />
            </li>
          ),
        )}
        {rules.length === 0 && <li className="p-4 text-center text-sm text-ink-3">No hay reglas.</li>}
      </ul>
      <button onClick={() => onChange(DEFAULT_RULES)} className="self-start text-sm font-semibold text-ink-3 hover:text-ink-2">
        Restaurar reglas predeterminadas
      </button>
    </div>
  )
}
