// ============================================================
// Band bucketing — pure math, no Web Audio objects.
//
// The analyser hands us fftSize/2 byte magnitudes, one per
// frequency bin of width sampleRate/fftSize Hz. We collapse
// them into three musical bands:
//
//   bass 20–250 Hz · mid 250–2000 Hz · high 2000–8000 Hz
// ============================================================

export const BAND_RANGES = {
  bass: [20, 250],
  mid: [250, 2000],
  high: [2000, 8000],
}

// Map a [loHz, hiHz] range to inclusive FFT bin indices.
export function binRange([loHz, hiHz], sampleRate, fftSize) {
  const hzPerBin = sampleRate / fftSize
  const lastBin = fftSize / 2 - 1
  const start = Math.min(lastBin, Math.max(0, Math.floor(loHz / hzPerBin)))
  const end = Math.min(lastBin, Math.max(start, Math.ceil(hiHz / hzPerBin)))
  return [start, end]
}

// Precompute all three ranges once per (sampleRate, fftSize) pair.
export function makeBins(sampleRate, fftSize) {
  return {
    bass: binRange(BAND_RANGES.bass, sampleRate, fftSize),
    mid: binRange(BAND_RANGES.mid, sampleRate, fftSize),
    high: binRange(BAND_RANGES.high, sampleRate, fftSize),
  }
}

// Mean magnitude over an inclusive bin range, normalized to 0..1.
export function bandLevel(freqData, [start, end]) {
  let sum = 0
  for (let i = start; i <= end; i += 1) sum += freqData[i]
  return sum / ((end - start + 1) * 255)
}

// One frame of raw (un-smoothed) band energies.
export function computeBands(freqData, bins) {
  const bass = bandLevel(freqData, bins.bass)
  const mid = bandLevel(freqData, bins.mid)
  const high = bandLevel(freqData, bins.high)
  return {
    bass,
    mid,
    high,
    // overall loudness drives bloom; bass-weighted because that is
    // what "loud" feels like in a body
    loud: bass * 0.5 + mid * 0.35 + high * 0.15,
  }
}
