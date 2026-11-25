import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PronunciationRule, ReadingPosition } from '../types/document'
import { applyPronunciation } from '../utils/pronunciation'

export const MIN_RATE = 0.5
export const MAX_RATE = 3
export const clampRate = (r: number) => Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, r)) * 10) / 10

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

function voiceScore(v: SpeechSynthesisVoice) {
  const lang = v.lang.toLowerCase()
  let s = 0
  if (lang.startsWith('es')) s += 100
  if (/es[-_](mx|us|419)/.test(lang)) s += 12
  else if (/es[-_]es/.test(lang)) s += 8
  if (/natural|neural|premium|enhanced|mejorad|siri/i.test(v.name)) s += 20
  if (/google/i.test(v.name)) s += 10
  if (v.localService) s += 2
  return s
}

export function sortVoices(voices: SpeechSynthesisVoice[]) {
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
}

export interface SpeechReaderOptions {
  position: ReadingPosition
  onPosition: (p: ReadingPosition) => void
  getSentences: (page: number) => string[] | null
  pageCount: number
  /** El documento sigue cargando páginas en segundo plano. */
  loading: boolean
  rate: number
  voiceURI: string | null
  rules: PronunciationRule[]
  /** Devuelve false para detener la lectura antes de pasar a `to` (temporizador de sueño). */
  canAdvance?: (from: ReadingPosition, to: ReadingPosition) => boolean
  onSentenceSpoken?: (seconds: number) => void
  onPageFinished?: () => void
  onFinished?: () => void
}

export function useSpeechReader(opts: SpeechReaderOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const optsRef = useRef(opts)
  optsRef.current = opts
  const posRef = useRef(opts.position)
  posRef.current = opts.position
  const playingRef = useRef(false)
  const genRef = useRef(0)
  const errorsRef = useRef(0)
  const waitTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!synth) return
    const load = () => setVoices(sortVoices(synth.getVoices()))
    load()
    synth.addEventListener?.('voiceschanged', load)
    const t = window.setTimeout(load, 800)
    return () => {
      synth.removeEventListener?.('voiceschanged', load)
      window.clearTimeout(t)
    }
  }, [])

  const voice = useMemo(() => {
    if (!voices.length) return null
    return voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices[0]
  }, [voices, opts.voiceURI])
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  const stopInternal = useCallback(() => {
    genRef.current++
    if (waitTimer.current) window.clearTimeout(waitTimer.current)
    synth?.cancel()
  }, [])

  const speakAt = useCallback(
    (pos: ReadingPosition) => {
      if (!synth) return
      stopInternal()
      const gen = genRef.current
      const o = optsRef.current
      const sentences = o.getSentences(pos.page)
      if (!sentences) {
        // Página aún no procesada: esperar.
        if (o.loading) {
          waitTimer.current = window.setTimeout(() => playingRef.current && speakAt(pos), 600)
          return
        }
        playingRef.current = false
        setIsPlaying(false)
        return
      }
      const text = sentences[pos.sentence]
      if (text === undefined) {
        advance(pos)
        return
      }
      const u = new SpeechSynthesisUtterance(applyPronunciation(text, o.rules))
      const v = voiceRef.current
      if (v) {
        u.voice = v
        u.lang = v.lang
      } else u.lang = 'es-MX'
      u.rate = o.rate
      let started = performance.now()
      u.onstart = () => {
        started = performance.now()
      }
      u.onend = () => {
        if (gen !== genRef.current) return
        errorsRef.current = 0
        optsRef.current.onSentenceSpoken?.((performance.now() - started) / 1000)
        advance(pos)
      }
      u.onerror = (e) => {
        if (gen !== genRef.current) return
        if (e.error === 'interrupted' || e.error === 'canceled') return
        errorsRef.current++
        if (errorsRef.current > 3) {
          playingRef.current = false
          setIsPlaying(false)
          return
        }
        waitTimer.current = window.setTimeout(() => advance(pos), 250)
      }
      // Pequeño respiro tras cancel(): evita que Chrome descarte el siguiente enunciado.
      window.setTimeout(() => {
        if (gen !== genRef.current) return
        synth.speak(u)
      }, 40)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopInternal],
  )

  const advance = useCallback(
    (from: ReadingPosition) => {
      if (!playingRef.current) return
      const o = optsRef.current
      const sentences = o.getSentences(from.page) ?? []
      let to: ReadingPosition
      if (from.sentence + 1 < sentences.length) to = { page: from.page, sentence: from.sentence + 1 }
      else {
        o.onPageFinished?.()
        if (from.page + 1 >= o.pageCount && !o.loading) {
          playingRef.current = false
          setIsPlaying(false)
          o.onFinished?.()
          return
        }
        to = { page: from.page + 1, sentence: 0 }
      }
      if (o.canAdvance && !o.canAdvance(from, to)) {
        playingRef.current = false
        setIsPlaying(false)
        o.onPosition(to)
        return
      }
      o.onPosition(to)
      speakAt(to)
    },
    [speakAt],
  )

  const play = useCallback(
    (from?: ReadingPosition) => {
      if (!synth) return
      const pos = from ?? posRef.current
      if (from) optsRef.current.onPosition(from)
      playingRef.current = true
      setIsPlaying(true)
      errorsRef.current = 0
      speakAt(pos)
    },
    [speakAt],
  )

  const pause = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    stopInternal()
  }, [stopInternal])

  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [pause, play])

  const step = useCallback(
    (dir: 1 | -1) => {
      const o = optsRef.current
      const cur = posRef.current
      let to: ReadingPosition | null = null
      if (dir === 1) {
        const n = o.getSentences(cur.page)?.length ?? 0
        if (cur.sentence + 1 < n) to = { page: cur.page, sentence: cur.sentence + 1 }
        else if (cur.page + 1 < o.pageCount) to = { page: cur.page + 1, sentence: 0 }
      } else {
        if (cur.sentence > 0) to = { page: cur.page, sentence: cur.sentence - 1 }
        else if (cur.page > 0) {
          const prev = o.getSentences(cur.page - 1)
          to = { page: cur.page - 1, sentence: Math.max(0, (prev?.length ?? 1) - 1) }
        }
      }
      if (!to) return
      o.onPosition(to)
      if (playingRef.current) speakAt(to)
    },
    [speakAt],
  )

  const jumpTo = useCallback(
    (pos: ReadingPosition, autoplay?: boolean) => {
      optsRef.current.onPosition(pos)
      if (autoplay ?? playingRef.current) {
        playingRef.current = true
        setIsPlaying(true)
        speakAt(pos)
      }
    },
    [speakAt],
  )

  /** Lee un texto suelto (p. ej. probar una regla de pronunciación). */
  const preview = useCallback((text: string) => {
    if (!synth) return
    pause()
    const u = new SpeechSynthesisUtterance(applyPronunciation(text, optsRef.current.rules))
    const v = voiceRef.current
    if (v) {
      u.voice = v
      u.lang = v.lang
    }
    u.rate = optsRef.current.rate
    window.setTimeout(() => synth.speak(u), 40)
  }, [pause])

  // Cambio de velocidad o voz en vivo: reinicia la frase actual al instante.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (playingRef.current) speakAt(posRef.current)
  }, [opts.rate, voice, speakAt])

  useEffect(() => () => stopInternal(), [stopInternal])

  return { supported: !!synth, isPlaying, voices, voice, play, pause, toggle, step, jumpTo, preview, stop: pause }
}
