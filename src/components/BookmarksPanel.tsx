import { useState } from 'react'
import type { Bookmark } from '../types/document'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

export const MARK_COLORS: { value: Bookmark['color']; label: string }[] = [
  { value: 'amber', label: 'Ámbar' },
  { value: 'green', label: 'Verde' },
  { value: 'blue', label: 'Azul' },
  { value: 'rose', label: 'Rosa' },
]

const swatch: Record<Bookmark['color'], string> = {
  amber: 'var(--mark-amber)',
  green: 'var(--mark-green)',
  blue: 'var(--mark-blue)',
  rose: 'var(--mark-rose)',
}

export function ColorDot({ color, size = 14 }: { color: Bookmark['color']; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full ring-1 ring-black/10" style={{ width: size, height: size, background: swatch[color] }} />
}

interface Props {
  bookmarks: Bookmark[]
  onJump: (b: Bookmark) => void
  onEdit: (b: Bookmark) => void
  onDelete: (b: Bookmark) => void
  onExport: () => void
}

export function BookmarksPanel({ bookmarks, onJump, onEdit, onDelete, onExport }: Props) {
  const [filter, setFilter] = useState<'all' | 'notes'>('all')
  const list = filter === 'notes' ? bookmarks.filter((b) => b.note.trim()) : bookmarks
  if (!bookmarks.length)
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent-text">
          <Icon.Bookmark size={28} />
        </span>
        <p className="mt-4 font-semibold text-ink">Aún no hay marcadores</p>
        <p className="mt-1 max-w-xs text-sm text-ink-3">Toca cualquier frase del texto y elige «Marcar» o «Nota» para guardarla aquí.</p>
      </div>
    )
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {(['all', 'notes'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 rounded-full px-4 text-sm font-semibold transition ${filter === f ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2'}`}
          >
            {f === 'all' ? `Todos · ${bookmarks.length}` : `Con nota · ${bookmarks.filter((b) => b.note.trim()).length}`}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={onExport} className="flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold text-ink-2 hover:bg-surface-3" title="Exportar como Markdown">
          <Icon.Download size={16} /> Exportar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((b) => (
          <li key={b.id} className="rounded-2xl bg-surface-2 p-1">
            <button onClick={() => onJump(b)} className="w-full rounded-xl px-3 pt-2.5 pb-2 text-left">
              <span className="flex items-center gap-2 text-[11px] text-ink-3">
                <ColorDot color={b.color} size={10} />
                <span className="font-mono">pág. {b.page + 1}</span>
                <span>· {new Date(b.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
              </span>
              <span className="mt-1.5 line-clamp-3 block font-serif text-[15px] leading-snug text-ink">«{b.text}»</span>
              {b.note && <span className="mt-2 block rounded-lg bg-surface px-3 py-2 text-sm leading-snug text-ink-2">{b.note}</span>}
            </button>
            <div className="flex justify-end gap-1 px-1 pb-1">
              <button onClick={() => onEdit(b)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-2 hover:bg-surface-3">
                <Icon.Note size={14} /> {b.note ? 'Editar nota' : 'Añadir nota'}
              </button>
              <button onClick={() => onDelete(b)} aria-label="Eliminar marcador" className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-accent-text">
                <Icon.Trash size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NoteEditor({
  bookmark,
  onClose,
  onSave,
  onDelete,
}: {
  bookmark: Bookmark | null
  onClose: () => void
  onSave: (b: Bookmark) => void
  onDelete: (b: Bookmark) => void
}) {
  const [note, setNote] = useState(bookmark?.note ?? '')
  const [color, setColor] = useState<Bookmark['color']>(bookmark?.color ?? 'amber')
  const [key, setKey] = useState(bookmark?.id)
  if (bookmark && bookmark.id !== key) {
    setKey(bookmark.id)
    setNote(bookmark.note)
    setColor(bookmark.color)
  }
  return (
    <Sheet open={!!bookmark} onClose={onClose} title={bookmark?.note ? 'Editar nota' : 'Nota y marcador'} subtitle={bookmark ? `Página ${bookmark.page + 1}` : undefined}>
      {bookmark && (
        <div className="flex flex-col gap-4">
          <blockquote className="rounded-2xl bg-surface-2 p-4 font-serif text-[15px] leading-snug text-ink-2">«{bookmark.text}»</blockquote>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
            rows={4}
            placeholder="Escribe tu nota…"
            className="w-full resize-none rounded-2xl border border-line bg-surface p-4 text-base text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-2">Color</span>
            {MARK_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                aria-label={c.label}
                aria-pressed={color === c.value}
                className={`grid size-9 place-items-center rounded-full transition ${color === c.value ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
              >
                <ColorDot color={c.value} size={26} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDelete(bookmark)} className="h-12 rounded-2xl px-4 font-semibold text-ink-2 hover:bg-surface-2">
              Quitar marcador
            </button>
            <button onClick={() => onSave({ ...bookmark, note: note.trim(), color })} className="h-12 flex-1 rounded-2xl bg-accent font-semibold text-accent-ink">
              Guardar
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
