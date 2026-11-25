import type { DayStats, ReadingStats } from '../types/document'

export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const emptyDay = (): DayStats => ({ seconds: 0, sentences: 0, pages: 0 })

export function addToStats(
  stats: ReadingStats,
  docId: string | null,
  delta: Partial<DayStats>,
): ReadingStats {
  const key = dayKey()
  const day = { ...emptyDay(), ...stats.days[key] }
  day.seconds += delta.seconds ?? 0
  day.sentences += delta.sentences ?? 0
  day.pages += delta.pages ?? 0
  const perDoc = { ...stats.perDoc }
  if (docId) {
    const d = perDoc[docId] ?? { seconds: 0, sentences: 0 }
    perDoc[docId] = { seconds: d.seconds + (delta.seconds ?? 0), sentences: d.sentences + (delta.sentences ?? 0) }
  }
  return { ...stats, days: { ...stats.days, [key]: day }, perDoc }
}

/** Días consecutivos (hasta hoy o ayer) con al menos un minuto de escucha. */
export function streak(stats: ReadingStats): number {
  let n = 0
  const d = new Date()
  if ((stats.days[dayKey(d)]?.seconds ?? 0) < 60) d.setDate(d.getDate() - 1)
  for (;;) {
    if ((stats.days[dayKey(d)]?.seconds ?? 0) >= 60) {
      n++
      d.setDate(d.getDate() - 1)
    } else break
  }
  return n
}

export function lastDays(stats: ReadingStats, count: number) {
  const out: { key: string; label: string; day: DayStats; isToday: boolean }[] = []
  const d = new Date()
  d.setDate(d.getDate() - (count - 1))
  const fmt = new Intl.DateTimeFormat('es', { weekday: 'narrow' })
  for (let i = 0; i < count; i++) {
    const key = dayKey(d)
    out.push({ key, label: fmt.format(d).toUpperCase(), day: stats.days[key] ?? emptyDay(), isToday: i === count - 1 })
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function formatDuration(seconds: number) {
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h} h ${m % 60} min`
}

/** Estimación de minutos restantes a partir de caracteres pendientes y la velocidad. */
export function estimateMinutes(chars: number, rate: number) {
  const charsPerMinute = 900 * rate // ~150 palabras/min a 1×
  return Math.max(1, Math.round(chars / charsPerMinute))
}
