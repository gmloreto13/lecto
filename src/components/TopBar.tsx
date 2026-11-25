import { Icon } from './Icons'

export type View = 'library' | 'reader' | 'stats' | 'settings'

const ITEMS: { view: View; label: string; icon: (p: { size?: number }) => React.ReactElement }[] = [
  { view: 'library', label: 'Biblioteca', icon: Icon.Library },
  { view: 'reader', label: 'Lector', icon: Icon.Headphones },
  { view: 'stats', label: 'Progreso', icon: Icon.Chart },
  { view: 'settings', label: 'Ajustes', icon: Icon.Settings },
]

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-accent-ink shadow-soft">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 4v16h9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 8.5a4 4 0 0 1 0 7M18 6a7.5 7.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-ink">Lecto</span>
    </span>
  )
}

/** Barra superior en escritorio (3 zonas) — en móvil solo logo y botón de carga. */
export function TopBar({ view, onView, onUpload, hasDoc }: { view: View; onView: (v: View) => void; onUpload: () => void; hasDoc: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/85 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-8">
        <button onClick={() => onView('library')} aria-label="Ir a la biblioteca">
          <Logo />
        </button>
        <nav className="mx-auto hidden items-center gap-1 rounded-full bg-surface-2 p-1 md:flex" aria-label="Secciones">
          {ITEMS.map((it) => (
            <button
              key={it.view}
              onClick={() => onView(it.view)}
              disabled={it.view === 'reader' && !hasDoc}
              aria-current={view === it.view ? 'page' : undefined}
              className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-40 ${
                view === it.view ? 'bg-surface text-ink shadow-soft' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <it.icon size={16} /> {it.label}
            </button>
          ))}
        </nav>
        <button
          onClick={onUpload}
          className="ml-auto flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-bg transition hover:opacity-90 active:scale-95 md:ml-0"
        >
          <Icon.Upload size={16} /> <span className="hidden sm:inline">Cargar archivo</span>
          <span className="sm:hidden">Cargar</span>
        </button>
      </div>
    </header>
  )
}

/** Navegación inferior para móvil. */
export function BottomNav({ view, onView, hasDoc }: { view: View; onView: (v: View) => void; hasDoc: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/90 pb-safe backdrop-blur-xl md:hidden" aria-label="Secciones">
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {ITEMS.map((it) => {
          const active = view === it.view
          return (
            <button
              key={it.view}
              onClick={() => onView(it.view)}
              disabled={it.view === 'reader' && !hasDoc}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition disabled:opacity-35 ${active ? 'text-accent-text' : 'text-ink-3'}`}
            >
              <span className={`grid h-7 w-14 place-items-center rounded-full transition ${active ? 'bg-accent-soft' : ''}`}>
                <it.icon size={20} />
              </span>
              {it.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
