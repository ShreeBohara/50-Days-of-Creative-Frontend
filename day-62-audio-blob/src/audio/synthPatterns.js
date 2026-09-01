// ============================================================
// Synth patterns — pure data + step math for the built-in track.
//
// A 4-bar loop of 16th steps: Am · Am · F · G. Melancholy
// synthwave, enough bass to swell the blob, enough hats to
// spike it.
// ============================================================

export const BPM = 112
export const STEPS_PER_BAR = 16
export const BARS = 4
export const TOTAL_STEPS = STEPS_PER_BAR * BARS

// seconds per 16th step
export function stepDuration(bpm = BPM) {
  return 60 / bpm / 4
}

// note name → frequency (equal temperament, A4 = 440)
export function noteHz(semitonesFromA4) {
  return 440 * Math.pow(2, semitonesFromA4 / 12)
}

const A1 = noteHz(-36)
const F1 = noteHz(-40)
const G1 = noteHz(-38)
const E2 = noteHz(-29)

// chord tones per bar for the arp (octaves 3–4)
const AM = [noteHz(-12), noteHz(-9), noteHz(-5), noteHz(0)] // A3 C4 E4 A4
const FM = [noteHz(-16), noteHz(-12), noteHz(-9), noteHz(-4)] // F3 A3 C4 F4
const GM = [noteHz(-14), noteHz(-10), noteHz(-7), noteHz(-2)] // G3 B3 D4 G4

// bass root per bar; each bar reuses one rhythm with its root
export const BAR_ROOTS = [A1, A1, F1, G1]

// bass rhythm: step → note length in steps (0 = rest).
// Index 12 walks up to E2 in bar 1 and 3 for movement.
export const BASS_RHYTHM = [3, 0, 0, 1, 0, 0, 2, 0, 3, 0, 0, 1, 2, 0, 1, 0]

// steps whose bass note plays the fifth (E2-ish lift) instead of the root
export const BASS_LIFT_STEPS = new Set([12])
export const BASS_LIFT_NOTE = E2

// arp chord tones per bar
export const ARP_CHORDS = [AM, AM, FM, GM]

// arp plays on every even step, cycling chord tones upward;
// odd steps are left to the echo delay
export function arpNoteForStep(step) {
  if (step % 2 !== 0) return null
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS
  const chord = ARP_CHORDS[bar]
  return chord[(step / 2) % chord.length]
}

// hats: closed on the 8th-note offbeats, ghost ticks on two 16ths,
// one open hat closing each bar — enough treble to needle the blob
export const HAT_CLOSED_STEPS = new Set([2, 6, 10, 14])
export const HAT_GHOST_STEPS = new Set([4, 12])
export const HAT_OPEN_STEPS = new Set([15])

export function hatForStep(stepInBar) {
  if (HAT_OPEN_STEPS.has(stepInBar)) return 'open'
  if (HAT_CLOSED_STEPS.has(stepInBar)) return 'closed'
  if (HAT_GHOST_STEPS.has(stepInBar)) return 'ghost'
  return null
}

// bass note (frequency + duration in steps) for an absolute step
export function bassNoteForStep(step) {
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS
  const stepInBar = step % STEPS_PER_BAR
  const lengthSteps = BASS_RHYTHM[stepInBar]
  if (!lengthSteps) return null
  const freq = BASS_LIFT_STEPS.has(stepInBar) ? BASS_LIFT_NOTE : BAR_ROOTS[bar]
  return { freq, lengthSteps }
}
