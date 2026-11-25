import {
  DEFAULT_SETTINGS,
  type Bookmark,
  type DocumentMeta,
  type PronunciationRule,
  type ReaderDocument,
  type ReaderSettings,
  type ReadingPosition,
  type ReadingStats,
} from '../types/document'

const DB_NAME = 'lecto'
const DB_VERSION = 2
const DOCS = 'documents'
const META = 'meta'
const MARKS = 'bookmarks'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(MARKS)) {
          const s = db.createObjectStore(MARKS, { keyPath: 'id' })
          s.createIndex('docId', 'docId')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        tx.oncomplete = () => resolve(req ? req.result : undefined)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch (e) {
    console.warn('[Lecto] almacenamiento no disponible', e)
    return fallback
  }
}

export const db = {
  saveDocument: (doc: ReaderDocument) => safe(run(DOCS, 'readwrite', (s) => s.put(doc)).then(() => true), false),
  getDocument: (id: string) => safe(run<ReaderDocument>(DOCS, 'readonly', (s) => s.get(id)), undefined),
  saveMeta: (meta: DocumentMeta) => safe(run(META, 'readwrite', (s) => s.put(meta)).then(() => true), false),
  listMeta: () => safe(run<DocumentMeta[]>(META, 'readonly', (s) => s.getAll()).then((r) => r ?? []), [] as DocumentMeta[]),
  async deleteDocument(id: string) {
    await safe(run(DOCS, 'readwrite', (s) => s.delete(id)), undefined)
    await safe(run(META, 'readwrite', (s) => s.delete(id)), undefined)
    const marks = await db.listBookmarks(id)
    for (const m of marks) await db.deleteBookmark(m.id)
  },
  async updatePosition(id: string, position: ReadingPosition) {
    const all = await db.listMeta()
    const meta = all.find((m) => m.id === id)
    if (meta) await db.saveMeta({ ...meta, position, lastOpenedAt: Date.now() })
  },
  saveBookmark: (b: Bookmark) => safe(run(MARKS, 'readwrite', (s) => s.put(b)).then(() => true), false),
  deleteBookmark: (id: string) => safe(run(MARKS, 'readwrite', (s) => s.delete(id)).then(() => true), false),
  listBookmarks: (docId?: string) =>
    safe(
      run<Bookmark[]>(MARKS, 'readonly', (s) => (docId ? s.index('docId').getAll(docId) : s.getAll())).then((r) =>
        (r ?? []).sort((a, b) => a.page - b.page || a.sentence - b.sentence),
      ),
      [] as Bookmark[],
    ),
}

// ---------- localStorage (preferencias ligeras) ----------

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}
function readLSArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) ? v : fallback
  } catch {
    return fallback
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* modo privado o cuota llena */
  }
}

export const prefs = {
  loadSettings: (): ReaderSettings => readLS('lecto.settings', DEFAULT_SETTINGS),
  saveSettings: (s: ReaderSettings) => writeLS('lecto.settings', s),
  loadStats: (): ReadingStats => readLS<ReadingStats>('lecto.stats', { days: {}, perDoc: {}, goalMinutes: 20 }),
  saveStats: (s: ReadingStats) => writeLS('lecto.stats', s),
  loadRules: (fallback: PronunciationRule[]): PronunciationRule[] => readLSArray('lecto.pronunciation', fallback),
  saveRules: (r: PronunciationRule[]) => writeLS('lecto.pronunciation', r),
  loadFlag: (key: string) => {
    try {
      return localStorage.getItem('lecto.flag.' + key) === '1'
    } catch {
      return false
    }
  },
  saveFlag: (key: string) => {
    try {
      localStorage.setItem('lecto.flag.' + key, '1')
    } catch {
      /* nada */
    }
  },
}

export function metaFromDoc(doc: ReaderDocument, position: ReadingPosition = { page: 0, sentence: 0 }): DocumentMeta {
  return {
    id: doc.id,
    title: doc.title,
    author: doc.author,
    format: doc.format,
    totalPages: doc.totalPages,
    loadedPages: doc.pages.length,
    complete: doc.complete,
    createdAt: doc.createdAt,
    lastOpenedAt: Date.now(),
    position,
    hue: doc.hue,
  }
}
