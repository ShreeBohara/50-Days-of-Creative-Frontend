import { describe, it, expect } from 'vitest'
import { isAudioFile } from './inputs.js'

describe('isAudioFile', () => {
  it('accepts files with an audio mime type', () => {
    expect(isAudioFile({ type: 'audio/mpeg', name: 'set.bin' })).toBe(true)
  })

  it('falls back to the extension when the mime is missing', () => {
    expect(isAudioFile({ type: '', name: 'track.mp3' })).toBe(true)
    expect(isAudioFile({ type: '', name: 'live.FLAC' })).toBe(true)
  })

  it('rejects non-audio files and nothing at all', () => {
    expect(isAudioFile({ type: 'image/png', name: 'cover.png' })).toBe(false)
    expect(isAudioFile(null)).toBe(false)
  })
})
