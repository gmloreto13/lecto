import { Sheet } from './Sheet'

export const SHORTCUTS: [string[], string][] = [
  [['Espacio'], 'Reproducir o pausar'],
  [['←', '→'], 'Oración anterior / siguiente'],
  [['Mayús', '←', '→'], 'Página anterior / siguiente'],
  [['↑', '↓'], 'Subir o bajar velocidad 0,1×'],
  [['1', '2', '3', '4'], 'Velocidad 1,0× · 1,25× · 1,5× · 2,0×'],
  [['/'], 'Buscar en el documento'],
  [['B'], 'Marcar la frase en curso'],
  [['T'], 'Índice y páginas'],
  [['D'], 'Cambiar tema claro / sepia / oscuro'],
  [['?'], 'Mostrar esta ayuda'],
  [['Esc'], 'Cerrar paneles'],
]

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Atajos de teclado" subtitle="Disponibles en el lector">
      <ul className="flex flex-col divide-y divide-line">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-ink-2">{label}</span>
            <span className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <kbd key={k} className="min-w-8 rounded-lg border border-b-2 border-line bg-surface-2 px-2 py-1 text-center font-mono text-xs text-ink">
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
