import type { DocumentMeta, ReadingStats } from '../types/document'
import { dayKey, formatDuration, lastDays, streak } from '../utils/stats'
import { Cover } from './Cover'
import { Icon } from './Icons'

interface Props {
  stats: ReadingStats
  docs: DocumentMeta[]
  onGoal: (minutes: number) => void
  onOpen: (id: string) => void
}

export function StatsView({ stats, docs, onGoal, onOpen }: Props) {
  const today = stats.days[dayKey()] ?? { seconds: 0, sentences: 0, pages: 0 }
  const week = lastDays(stats, 7)
  const month = lastDays(stats, 30)
  const max = Math.max(stats.goalMinutes * 60, ...week.map((d) => d.day.seconds), 1)
  const weekTotal = week.reduce((n, d) => n + d.day.seconds, 0)
  const total = Object.values(stats.days).reduce((n, d) => n + d.seconds, 0)
  const totalPages = Object.values(stats.days).reduce((n, d) => n + d.pages, 0)
  const s = streak(stats)
  const goalPct = Math.min(100, Math.round((today.seconds / (stats.goalMinutes * 60)) * 100))
  const topDocs = docs
    .filter((d) => stats.perDoc[d.id])
    .sort((a, b) => stats.perDoc[b.id].seconds - stats.perDoc[a.id].seconds)
    .slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 sm:px-8 sm:pt-8">
      <p className="text-sm font-medium text-ink-3">Tu hábito</p>
      <h1 className="mt-0.5 text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">Progreso</h1>

      <section className="mt-6 rounded-3xl bg-ink p-5 text-bg shadow-float sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase opacity-60">Hoy</p>
            <p className="mt-1 font-mono text-4xl font-medium tabular">{formatDuration(today.seconds)}</p>
            <p className="mt-1 text-sm opacity-70">
              {goalPct >= 100 ? '¡Meta cumplida!' : `${goalPct}% de tu meta de ${stats.goalMinutes} min`}
            </p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-current/10 px-4 py-3">
            <Icon.Flame size={22} className="text-accent" />
            <p className="mt-1 font-mono text-2xl font-medium tabular">{s}</p>
            <p className="text-[11px] opacity-70">{s === 1 ? 'día seguido' : 'días seguidos'}</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-current/15">
          <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${goalPct}%` }} />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Esta semana', value: formatDuration(weekTotal) },
          { label: 'Total', value: formatDuration(total) },
          { label: 'Páginas', value: totalPages.toLocaleString('es') },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-surface p-4 shadow-soft">
            <p className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{k.label}</p>
            <p className="mt-1 truncate font-mono text-lg font-medium text-ink tabular">{k.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold text-ink">Últimos 7 días</h2>
          <span className="text-xs text-ink-3">minutos escuchados</span>
        </div>
        <div className="relative mt-5 flex h-40 items-end gap-2 sm:gap-4">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/50"
            style={{ bottom: `${((stats.goalMinutes * 60) / max) * 100}%` }}
          >
            <span className="absolute -top-5 right-0 text-[10px] font-semibold text-accent-text">meta</span>
          </div>
          {week.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="font-mono text-[10px] text-ink-3 tabular">{d.day.seconds >= 60 ? Math.round(d.day.seconds / 60) : ''}</span>
              <div
                className={`w-full max-w-10 rounded-lg transition-all duration-700 ${d.isToday ? 'bg-accent' : 'bg-ink-3/40'}`}
                style={{ height: `${Math.max(3, (d.day.seconds / max) * 100)}%` }}
                title={`${d.key}: ${formatDuration(d.day.seconds)}`}
              />
              <span className={`text-[11px] font-semibold ${d.isToday ? 'text-accent-text' : 'text-ink-3'}`}>{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5 shadow-soft">
        <h2 className="font-bold text-ink">Últimos 30 días</h2>
        <div className="mt-4 grid grid-cols-10 gap-1.5">
          {month.map((d) => {
            const lvl = d.day.seconds === 0 ? 0 : d.day.seconds < 300 ? 1 : d.day.seconds < stats.goalMinutes * 60 ? 2 : 3
            const bg = ['var(--surface-2)', 'color-mix(in oklab, var(--accent) 30%, var(--surface-2))', 'color-mix(in oklab, var(--accent) 60%, var(--surface-2))', 'var(--accent)'][lvl]
            return <div key={d.key} title={`${d.key}: ${formatDuration(d.day.seconds)}`} className={`aspect-square rounded-md ${d.isToday ? 'ring-2 ring-ink/40' : ''}`} style={{ background: bg }} />
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text">
            <Icon.Target size={20} />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-ink">Meta diaria</h2>
            <p className="text-sm text-ink-3">Minutos de escucha al día</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[10, 15, 20, 30, 60].map((m) => (
            <button
              key={m}
              onClick={() => onGoal(m)}
              className={`h-11 rounded-xl font-mono text-sm transition ${stats.goalMinutes === m ? 'bg-ink font-medium text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {topDocs.length > 0 && (
        <section className="mt-4 rounded-3xl bg-surface p-5 shadow-soft">
          <h2 className="mb-3 font-bold text-ink">Lo más escuchado</h2>
          <ul className="-mx-2 flex flex-col">
            {topDocs.map((d) => (
              <li key={d.id}>
                <button onClick={() => onOpen(d.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2">
                  <Cover title={d.title} hue={d.hue} format={d.format} className="w-9 shrink-0" small />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{d.title}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-3">{formatDuration(stats.perDoc[d.id].seconds)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
