import type { PronunciationRule } from '../types/document'

const rid = () => 'r_' + Math.random().toString(36).slice(2, 9)

export const DEFAULT_RULES: PronunciationRule[] = [
  { id: 'd1', from: 'Sr.', to: 'señor', wholeWord: true, caseSensitive: true, enabled: true },
  { id: 'd2', from: 'Sra.', to: 'señora', wholeWord: true, caseSensitive: true, enabled: true },
  { id: 'd3', from: 'Dr.', to: 'doctor', wholeWord: true, caseSensitive: true, enabled: true },
  { id: 'd4', from: 'Dra.', to: 'doctora', wholeWord: true, caseSensitive: true, enabled: true },
  { id: 'd5', from: 'etc.', to: 'etcétera', wholeWord: true, caseSensitive: false, enabled: true },
  { id: 'd6', from: 'p. ej.', to: 'por ejemplo', wholeWord: true, caseSensitive: false, enabled: true },
  { id: 'd7', from: 'EE. UU.', to: 'Estados Unidos', wholeWord: true, caseSensitive: true, enabled: true },
  { id: 'd8', from: 'pág.', to: 'página', wholeWord: true, caseSensitive: false, enabled: true },
]

export function newRule(from = '', to = ''): PronunciationRule {
  return { id: rid(), from, to, wholeWord: true, caseSensitive: false, enabled: true }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type Compiled = { re: RegExp; to: string }
let cacheKey = ''
let cache: Compiled[] = []

function compile(rules: PronunciationRule[]): Compiled[] {
  const key = JSON.stringify(rules)
  if (key === cacheKey) return cache
  cacheKey = key
  cache = rules
    .filter((r) => r.enabled && r.from.trim())
    // Las reglas más largas primero, para que "Sra." gane a "Sr.".
    .sort((a, b) => b.from.length - a.from.length)
    .map((r) => {
      const body = escape(r.from.trim())
      const startsWord = /^[\p{L}\p{N}]/u.test(r.from.trim())
      const endsWord = /[\p{L}\p{N}]$/u.test(r.from.trim())
      const pre = r.wholeWord && startsWord ? '(?<![\\p{L}\\p{N}])' : ''
      const post = r.wholeWord && endsWord ? '(?![\\p{L}\\p{N}])' : ''
      return { re: new RegExp(pre + body + post, r.caseSensitive ? 'gu' : 'giu'), to: r.to }
    })
  return cache
}

/** Aplica el diccionario de pronunciación al texto que se envía a la voz (no al que se muestra). */
export function applyPronunciation(text: string, rules: PronunciationRule[]): string {
  let out = text
  for (const { re, to } of compile(rules)) out = out.replace(re, to)
  return out
}
