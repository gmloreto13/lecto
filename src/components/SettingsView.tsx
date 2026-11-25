import type { PronunciationRule, ReaderSettings } from '../types/document'
import { Icon } from './Icons'
import { PronunciationPanel } from './PronunciationPanel'
import { Segmented, Toggle } from './Sheet'

export function AppearanceControls({ settings, onChange }: { settings: ReaderSettings; onChange: (patch: Partial<ReaderSettings>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-2">Tema</p>
        <Segmented
          value={settings.theme}
          onChange={(theme) => onChange({ theme })}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: <><Icon.Sun size={15} /> Claro</> },
            { value: 'sepia', label: 'Sepia' },
            { value: 'dark', label: <><Icon.Moon size={15} /> Oscuro</> },
          ]}
        />
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink-2">Tamaño de letra</p>
          <span className="font-mono text-xs text-ink-3">{settings.fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ fontSize: Math.max(14, settings.fontSize - 1) })}
            className="h-12 w-16 rounded-2xl bg-surface-2 font-serif text-base font-semibold text-ink hover:bg-surface-3"
            aria-label="Reducir letra"
          >
            A−
          </button>
          <div className="flex h-12 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-line px-3 font-serif text-ink" style={{ fontSize: Math.min(settings.fontSize, 30) }}>
            Aa
          </div>
          <button
            onClick={() => onChange({ fontSize: Math.min(34, settings.fontSize + 1) })}
            className="h-12 w-16 rounded-2xl bg-surface-2 font-serif text-xl font-semibold text-ink hover:bg-surface-3"
            aria-label="Aumentar letra"
          >
            A+
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-2">Interlineado</p>
        <Segmented
          value={settings.lineHeight}
          onChange={(lineHeight) => onChange({ lineHeight })}
          options={[
            { value: 1.5, label: 'Compacto' },
            { value: 1.7, label: 'Normal' },
            { value: 1.95, label: 'Amplio' },
          ]}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-2">Seguir la lectura</p>
          <p className="text-xs text-ink-3">Desplaza el texto para mantener visible la frase en curso</p>
        </div>
        <Toggle checked={settings.autoScroll} onChange={(autoScroll) => onChange({ autoScroll })} label="Seguir la lectura" />
      </div>
    </div>
  )
}

interface Props {
  settings: ReaderSettings
  onSettings: (patch: Partial<ReaderSettings>) => void
  rules: PronunciationRule[]
  onRules: (r: PronunciationRule[]) => void
  onPreview: (t: string) => void
  onShortcuts: () => void
  canInstall: boolean
  installed: boolean
  onInstall: () => void
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">{icon}</span>
        <div>
          <h2 className="font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function SettingsView(p: Props) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 sm:px-8 sm:pt-8">
      <p className="text-sm font-medium text-ink-3">Personaliza Lecto</p>
      <h1 className="mt-0.5 text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">Ajustes</h1>
      <div className="mt-6 flex flex-col gap-4">
        <Card title="Lectura" subtitle="Tipografía y colores" icon={<Icon.Type size={20} />}>
          <AppearanceControls settings={p.settings} onChange={p.onSettings} />
        </Card>
        <Card title="Pronunciación" subtitle="Corrige cómo se leen siglas, nombres y abreviaturas" icon={<Icon.Speak size={20} />}>
          <PronunciationPanel rules={p.rules} onChange={p.onRules} onPreview={p.onPreview} />
        </Card>
        <Card title="App en tu móvil" subtitle={p.installed ? 'Lecto ya está instalada' : 'Úsala sin conexión desde la pantalla de inicio'} icon={<Icon.Phone size={20} />}>
          {p.installed ? (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Icon.Check size={16} className="text-accent" /> Estás usando la app instalada. Tus documentos se guardan en este dispositivo.
            </p>
          ) : p.canInstall ? (
            <button onClick={p.onInstall} className="h-12 w-full rounded-2xl bg-accent font-semibold text-accent-ink">
              Instalar Lecto
            </button>
          ) : (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2">
              {isIOS ? (
                <>
                  <li>Abre Lecto en Safari.</li>
                  <li>Toca el botón Compartir.</li>
                  <li>Elige «Añadir a pantalla de inicio».</li>
                </>
              ) : (
                <>
                  <li>Abre Lecto en Chrome o Edge desde su dirección web.</li>
                  <li>Abre el menú ⋮ del navegador.</li>
                  <li>Elige «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
                </>
              )}
            </ol>
          )}
        </Card>
        <button onClick={p.onShortcuts} className="flex items-center gap-3 rounded-3xl bg-surface p-5 text-left shadow-soft transition hover:shadow-float">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
            <Icon.Keyboard size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-bold text-ink">Atajos de teclado</span>
            <span className="block text-sm text-ink-3">Para usar Lecto más rápido en el ordenador</span>
          </span>
          <Icon.ChevronRight className="text-ink-3" />
        </button>
        <p className="mt-2 text-center text-xs text-ink-3">Lecto 2.0 · Tus archivos nunca salen de tu dispositivo.</p>
      </div>
    </div>
  )
}
