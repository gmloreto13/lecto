export const MAX_DOCUMENT_PAGES = 1000

export type DocumentFormat = 'pdf' | 'epub' | 'txt' | 'md' | 'sample'

/** Una página es una lista de párrafos; cada párrafo es una lista de oraciones. */
export interface DocumentPage {
  paragraphs: string[][]
}

export interface DocumentChapter {
  title: string
  /** Índice de página (base 0). */
  page: number
  level?: number
}

export interface ReaderDocument {
  id: string
  title: string
  author?: string
  format: DocumentFormat
  pages: DocumentPage[]
  chapters: DocumentChapter[]
  /** Páginas totales esperadas (puede ser mayor que pages.length mientras se procesa). */
  totalPages: number
  complete: boolean
  createdAt: number
  /** Color de portada generado. */
  hue: number
}

export interface ReadingPosition {
  page: number
  sentence: number
}

export interface DocumentMeta {
  id: string
  title: string
  author?: string
  format: DocumentFormat
  totalPages: number
  loadedPages: number
  complete: boolean
  createdAt: number
  lastOpenedAt: number
  position: ReadingPosition
  hue: number
}

export type ThemeName = 'light' | 'sepia' | 'dark'

export interface ReaderSettings {
  rate: number
  voiceURI: string | null
  fontSize: number
  lineHeight: number
  theme: ThemeName | 'system'
  autoScroll: boolean
}

export interface ParseProgress {
  fileName: string
  stage: 'reading' | 'parsing' | 'background' | 'done' | 'error'
  loaded: number
  total: number
  message?: string
}

export interface Bookmark {
  id: string
  docId: string
  page: number
  sentence: number
  text: string
  note: string
  color: 'amber' | 'green' | 'blue' | 'rose'
  createdAt: number
}

export interface PronunciationRule {
  id: string
  from: string
  to: string
  wholeWord: boolean
  caseSensitive: boolean
  enabled: boolean
}

export interface DayStats {
  /** Segundos escuchados. */
  seconds: number
  sentences: number
  pages: number
}

export interface ReadingStats {
  days: Record<string, DayStats>
  perDoc: Record<string, { seconds: number; sentences: number }>
  goalMinutes: number
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  rate: 1,
  voiceURI: null,
  fontSize: 20,
  lineHeight: 1.7,
  theme: 'system',
  autoScroll: true,
}
