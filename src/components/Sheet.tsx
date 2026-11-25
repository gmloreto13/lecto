import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icons'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
  /** Ocupa casi toda la altura (búsqueda, índice). */
  tall?: boolean
}

/** Hoja inferior en móvil, diálogo centrado en escritorio. Se cierra deslizando hacia abajo. */
export function Sheet({ open, onClose, title, subtitle, children, actions, tall }: SheetProps) {
  const [drag, setDrag] = useState(0)
  const startY = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const prev = document.activeElement as HTMLElement | null
    window.setTimeout(() => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    }, 30)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Cerrar" className="animate-fade absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" onClick={onClose} tabIndex={-1} />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className={`animate-sheet sm:animate-pop relative flex w-full flex-col rounded-t-[28px] bg-surface shadow-float outline-none sm:max-w-lg sm:rounded-[28px] ${
          tall ? 'h-[88dvh] sm:h-[80dvh]' : 'max-h-[88dvh] sm:max-h-[80dvh]'
        }`}
      >
        <div
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 sm:hidden"
          onPointerDown={(e) => {
            startY.current = e.clientY
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => startY.current !== null && setDrag(Math.max(0, e.clientY - startY.current))}
          onPointerUp={() => {
            if (drag > 90) onClose()
            setDrag(0)
            startY.current = null
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-surface-3" />
        </div>
        <header className="flex items-start gap-3 px-5 pt-2 pb-3 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-ink-3">{subtitle}</p>}
          </div>
          {actions}
          <button onClick={onClose} aria-label="Cerrar" className="-mr-1 grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition hover:bg-surface-3">
            <Icon.X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { value: T; label: ReactNode; aria?: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`flex rounded-2xl bg-surface-2 p-1 ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.aria}
          onClick={() => onChange(o.value)}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition ${
            o.value === value ? 'bg-surface text-ink shadow-soft' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}
