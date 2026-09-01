import { useEffect, useRef } from 'react'
import { engine } from '../audio/engine.js'
import { themeState } from '../themes.js'

const BAR_COUNT = 72
const MAX_HZ = 8000 // matches the top of the analyzed high band

// Live mini spectrum: log-spaced bars from ~20 Hz to 8 kHz, tinted
// along the active theme's gradient. Runs its own rAF loop so it
// works in both the WebGL scene and the 2D fallback.
export default function SpectrumStrip() {
  const canvasRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const scratch = new Uint8Array(512)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const theme = themeState.current
      const analyser = engine.analyser
      const barW = w / BAR_COUNT

      let bins = null
      let maxBin = 1
      if (analyser && engine.mode !== 'idle') {
        analyser.getByteFrequencyData(scratch)
        bins = scratch
        const hzPerBin = engine.ctx.sampleRate / analyser.fftSize
        maxBin = Math.min(analyser.frequencyBinCount - 1, MAX_HZ / hzPerBin)
      }

      for (let i = 0; i < BAR_COUNT; i += 1) {
        const t = i / (BAR_COUNT - 1)
        let value = 0
        if (bins) {
          // log spacing: musical octaves get equal visual width
          const bin = Math.round(Math.pow(maxBin, t))
          value = bins[Math.min(bins.length - 1, bin)] / 255
        }
        const barH = Math.max(1.5, value * (h - 4))
        // tint along the spectral gradient, dim when quiet
        const c1 = theme.lowColor
        const c2 = theme.highColor
        const r = Math.round((c1.r + (c2.r - c1.r) * t) * 255)
        const g = Math.round((c1.g + (c2.g - c1.g) * t) * 255)
        const b = Math.round((c1.b + (c2.b - c1.b) * t) * 255)
        ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + value * 0.75})`
        ctx.fillRect(i * barW + barW * 0.18, h - barH, barW * 0.64, barH)
      }
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas className="spectrum-strip" ref={canvasRef} aria-hidden="true" />
}
