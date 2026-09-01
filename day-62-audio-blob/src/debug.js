// ------------------------------------------------------------
// QA / debug handle.
//
// The blob's motion is driven by live audio, which is awkward to
// script in automated checks (autoplay policies, no mic in CI).
// This handle lets DevTools force the band values directly:
//
//   window.resonance.setBands({ bass: 1, mid: 0.5, high: 0.2 })
//   window.resonance.clearBands()
//
// While enabled, forced values REPLACE the analyser output.
// ------------------------------------------------------------

export const debugBands = {
  enabled: false,
  bass: 0,
  mid: 0,
  high: 0,
  loud: 0,
}

if (typeof window !== 'undefined') {
  window.resonance = {
    ...(window.resonance || {}),
    setBands(bands) {
      Object.assign(debugBands, bands)
      debugBands.enabled = true
      debugBands.loud =
        bands.loud ??
        (debugBands.bass + debugBands.mid + debugBands.high) / 3
    },
    clearBands() {
      debugBands.enabled = false
      debugBands.bass = debugBands.mid = debugBands.high = debugBands.loud = 0
    },
  }
}
