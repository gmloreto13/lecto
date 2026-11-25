import type { DocumentFormat } from '../types/document'

const FORMAT_LABEL: Record<DocumentFormat, string> = { pdf: 'PDF', epub: 'EPUB', txt: 'TXT', md: 'MD', sample: 'Ejemplo' }

export function Cover({ title, hue, format, className = '', small }: { title: string; hue: number; format: DocumentFormat; className?: string; small?: boolean }) {
  const bg = `linear-gradient(155deg, oklch(0.62 0.11 ${hue}) 0%, oklch(0.42 0.09 ${(hue + 30) % 360}) 100%)`
  return (
    <div
      className={`relative isolate flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl text-white shadow-soft ${small ? 'p-1.5' : 'p-3'} ${className}`}
      style={{ background: bg }}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-black/15" />
      <span className="pointer-events-none absolute -right-6 -bottom-8 size-28 rounded-full bg-white/10" />
      {!small && (
        <span className="self-start rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase">{FORMAT_LABEL[format]}</span>
      )}
      <span className={`line-clamp-4 font-serif leading-tight font-semibold text-balance drop-shadow-sm ${small ? 'text-[7px]' : 'text-[15px]'}`}>{title}</span>
    </div>
  )
}

export { FORMAT_LABEL }
