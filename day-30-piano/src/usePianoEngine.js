import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

export const INSTRUMENT_PRESETS = {
  piano: {
    label: 'Piano',
    synth: Tone.Synth,
    options: {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.012, decay: 0.24, sustain: 0.28, release: 1.35 },
    },
  },
  synth: {
    label: 'Synth',
    synth: Tone.Synth,
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.025, decay: 0.18, sustain: 0.48, release: 0.7 },
    },
  },
  organ: {
    label: 'Organ',
    synth: Tone.Synth,
    options: {
      oscillator: { type: 'square4' },
      envelope: { attack: 0.018, decay: 0.08, sustain: 0.86, release: 0.42 },
    },
  },
  marimba: {
    label: 'Marimba',
    synth: Tone.FMSynth,
    options: {
      harmonicity: 3.2,
      modulationIndex: 11,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.006, decay: 0.48, sustain: 0.08, release: 0.42 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.006, decay: 0.22, sustain: 0.08, release: 0.24 },
    },
  },
}

const DEFAULT_REVERB_DECAY = 2.4

function createVoice(instrument) {
  const preset = INSTRUMENT_PRESETS[instrument] ?? INSTRUMENT_PRESETS.piano

  return new Tone.PolySynth(preset.synth, {
    maxPolyphony: 18,
    ...preset.options,
  })
}

export function usePianoEngine({ instrument, volume }) {
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [audioError, setAudioError] = useState('')
  const synthRef = useRef(null)
  const reverbRef = useRef(null)
  const volumeRef = useRef(null)

  const disposeSynth = useCallback(() => {
    synthRef.current?.dispose()
    synthRef.current = null
  }, [])

  const ensureEngine = useCallback(async () => {
    try {
      await Tone.start()

      if (!volumeRef.current) {
        volumeRef.current = new Tone.Volume(volume).toDestination()
      }

      if (!reverbRef.current) {
        reverbRef.current = new Tone.Reverb({
          decay: DEFAULT_REVERB_DECAY,
          preDelay: 0.025,
          wet: 0.24,
        }).connect(volumeRef.current)
      }

      if (!synthRef.current) {
        synthRef.current = createVoice(instrument).connect(reverbRef.current)
      }

      setIsAudioReady(true)
      setAudioError('')
      return synthRef.current
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Audio could not start.')
      return null
    }
  }, [instrument, volume])

  const triggerAttack = useCallback(
    async (note, velocity = 0.82) => {
      const synth = await ensureEngine()
      synth?.triggerAttack(note, Tone.now(), velocity)
    },
    [ensureEngine],
  )

  const triggerRelease = useCallback((note) => {
    synthRef.current?.triggerRelease(note, Tone.now())
  }, [])

  const triggerAttackRelease = useCallback(
    async (note, duration = '8n', velocity = 0.82) => {
      const synth = await ensureEngine()
      synth?.triggerAttackRelease(note, duration, Tone.now(), velocity)
    },
    [ensureEngine],
  )

  useEffect(() => {
    if (volumeRef.current) {
      volumeRef.current.volume.value = volume
    }
  }, [volume])

  useEffect(() => {
    if (!synthRef.current || !reverbRef.current) {
      return
    }

    disposeSynth()
    synthRef.current = createVoice(instrument).connect(reverbRef.current)
  }, [disposeSynth, instrument])

  useEffect(() => {
    return () => {
      disposeSynth()
      reverbRef.current?.dispose()
      volumeRef.current?.dispose()
    }
  }, [disposeSynth])

  return {
    audioError,
    isAudioReady,
    triggerAttack,
    triggerAttackRelease,
    triggerRelease,
  }
}
