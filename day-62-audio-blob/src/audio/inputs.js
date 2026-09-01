// ============================================================
// Input modes — synth loop / microphone / dropped file.
//
// All three feed the same engine bus; switching modes swaps the
// source and sets the monitor gain:
//
//   synth → monitor OPEN  (you hear the loop)
//   file  → monitor OPEN  (you hear the track)
//   mic   → monitor MUTED (speakers + mic = feedback squeal)
//
// UI state (mic permission phase, current file name) lives in a
// tiny external store consumed via useSyncExternalStore.
// ============================================================

import { useSyncExternalStore } from 'react'
import { engine, ensureContext } from './engine.js'
import { startSynth, stopSynth } from './synth.js'

export const inputState = {
  mode: 'idle', // mirrors engine.mode: idle | synth | mic | file
  mic: 'idle', // idle | requesting | live | denied | unavailable
  fileName: null,
  fileError: null,
}

let version = 0
const listeners = new Set()

function emit(patch) {
  Object.assign(inputState, patch)
  version += 1
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// React hook: re-render on any input-state change
export function useInputState() {
  useSyncExternalStore(subscribe, () => version)
  return inputState
}

// --- internal source bookkeeping ------------------------------

let micStream = null
let micSource = null
let fileAudio = null
let fileUrl = null

function detachMic() {
  if (micSource) micSource.disconnect()
  if (micStream) micStream.getTracks().forEach((t) => t.stop())
  micSource = null
  micStream = null
}

function pauseFile() {
  if (fileAudio) fileAudio.pause()
}

// --- public mode switches -------------------------------------

export function enterSynthMode() {
  detachMic()
  pauseFile()
  startSynth() // sets engine.mode + opens the monitor
  emit({ mode: 'synth', mic: inputState.mic === 'live' ? 'idle' : inputState.mic })
}

export async function enterMicMode() {
  ensureContext()
  engine.ctx.resume()
  stopSynth()
  pauseFile()

  if (!navigator.mediaDevices?.getUserMedia) {
    emit({ mic: 'unavailable' })
    return false
  }

  emit({ mic: 'requesting' })
  try {
    // raw signal: processing tuned for speech flattens music
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch {
    emit({ mic: 'denied' })
    return false
  }

  micSource = engine.ctx.createMediaStreamSource(micStream)
  micSource.connect(engine.bus)
  engine.monitor.gain.value = 0 // never monitor the mic — feedback
  engine.mode = 'mic'
  emit({ mode: 'mic', mic: 'live' })
  return true
}

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm)$/i

export function isAudioFile(file) {
  if (!file) return false
  if (file.type && file.type.startsWith('audio/')) return true
  return AUDIO_EXTENSIONS.test(file.name || '')
}

export async function enterFileMode(file) {
  if (!isAudioFile(file)) {
    emit({ fileError: 'that is not an audio file' })
    return false
  }
  ensureContext()
  engine.ctx.resume()
  stopSynth()
  detachMic()

  if (fileUrl) URL.revokeObjectURL(fileUrl)
  fileUrl = URL.createObjectURL(file)

  if (!fileAudio) {
    fileAudio = new Audio()
    fileAudio.loop = true
    // createMediaElementSource is once-per-element; reuse the element
    const src = engine.ctx.createMediaElementSource(fileAudio)
    src.connect(engine.bus)
  }
  fileAudio.src = fileUrl

  try {
    await fileAudio.play()
  } catch {
    emit({ fileError: 'could not play that file' })
    return false
  }

  engine.monitor.gain.value = 1
  engine.mode = 'file'
  emit({
    mode: 'file',
    fileName: file.name,
    fileError: null,
    mic: inputState.mic === 'live' ? 'idle' : inputState.mic,
  })
  return true
}
