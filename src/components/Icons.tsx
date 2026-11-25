import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export const Icon = {
  Play: (p: P) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6Z" />
    </svg>
  ),
  Pause: (p: P) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4.2" height="14" rx="1.2" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.2" />
    </svg>
  ),
  Prev: (p: P) => (
    <svg {...base(p)}>
      <path d="M19 19 10 12l9-7v14Z" fill="currentColor" stroke="none" />
      <path d="M6 5v14" strokeWidth={2.2} />
    </svg>
  ),
  Next: (p: P) => (
    <svg {...base(p)}>
      <path d="m5 5 9 7-9 7V5Z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" strokeWidth={2.2} />
    </svg>
  ),
  ChevronLeft: (p: P) => (
    <svg {...base(p)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  ChevronRight: (p: P) => (
    <svg {...base(p)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  ChevronDown: (p: P) => (
    <svg {...base(p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Library: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 19.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v14.5" />
      <path d="M9 19.5V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v12.5" />
      <path d="m14.5 6.8 2.9-.8a1 1 0 0 1 1.22.7l3 11.2" />
      <path d="M3 20h18" />
    </svg>
  ),
  Book: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  ),
  Upload: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 15V4" />
      <path d="m7 8.5 5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  Search: (p: P) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  ),
  Bookmark: (p: P) => (
    <svg {...base(p)}>
      <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  BookmarkFill: (p: P) => (
    <svg {...base(p)} fill="currentColor">
      <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  List: (p: P) => (
    <svg {...base(p)}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  Moon: (p: P) => (
    <svg {...base(p)}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  ),
  Sun: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  ),
  Timer: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M9.5 2.5h5" />
    </svg>
  ),
  Chart: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 20V11M12 20V5M19 20v-6" strokeWidth={2.4} />
    </svg>
  ),
  Settings: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </svg>
  ),
  X: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Plus: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 12h14" />
    </svg>
  ),
  Trash: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7" />
    </svg>
  ),
  Note: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 3 3" />
    </svg>
  ),
  Keyboard: (p: P) => (
    <svg {...base(p)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  ),
  Headphones: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.5" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5" />
    </svg>
  ),
  Check: (p: P) => (
    <svg {...base(p)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  Download: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 4v11M7 10.5l5 5 5-5M4 19.5h16" />
    </svg>
  ),
  Type: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 7V5h11v2M9.5 5v14M7.5 19h4M14 13v-1.5h7V13M17.5 11.5V19M16 19h3" />
    </svg>
  ),
  Flame: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.9 3.3-5.8 3.9-9.9 2.6 1.6 4 3.9 4 6.4 1-.6 1.7-1.6 2-2.9 1.8 1.7 3.1 3.9 3.1 6.4 0 3.5-2.6 6.1-6.5 6.1Z" />
    </svg>
  ),
  Speak: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  ),
  Copy: (p: P) => (
    <svg {...base(p)}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </svg>
  ),
  More: (p: P) => (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </svg>
  ),
  Phone: (p: P) => (
    <svg {...base(p)}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  ),
  Target: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
}
