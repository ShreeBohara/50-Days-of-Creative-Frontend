import { useEffect, useRef } from 'react'
import { engine, sampleLevels } from './audio/engine.js'
import { themeState } from './themes.js'

const BAR_COUNT = 96
const MAX_HZ = 8000

// No WebGL? The blob flattens into a radial visualizer: a bass-pulsed
// core with a ring of log-spaced spectrum spokes, same audio engine,
// same themes — nobody gets a blank page.
export default function Fallback2D() {
  const ref = useRef(null)

  useEffect(() => {
    let raf = 0
    const scratch = new Uint8Array(512)

    const draw = (nowMs) => {
      raf = requestAnimationFrame(draw)
      const canvas = ref.current
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

      // with no Blob in the tree, the fallback is the frame sampler
      const levels = sampleLevels(nowMs / 1000)
      const theme = themeState.current
      const cx = w / 2
      const cy = h / 2
      const base = Math.min(w, h) * 0.17

      // pulsing core — bass does the breathing
      const coreR = base * (0.8 + levels.bass * 0.55)
      const core = ctx.createRadialGradient(cx, cy, coreR * 0.2, cx, cy, coreR)
      core.addColorStop(0, theme.low)
      core.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fill()

      // spectrum spokes
      let bins = null
      let maxBin = 1
      if (engine.analyser && engine.mode !== 'idle') {
        engine.analyser.getByteFrequencyData(scratch)
        bins = scratch
        const hzPerBin = engine.ctx.sampleRate / engine.analyser.fftSize
        maxBin = Math.min(engine.analyser.frequencyBinCount - 1, MAX_HZ / hzPerBin)
      }

      ctx.lineCap = 'round'
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const t = i / BAR_COUNT
        const angle = t * Math.PI * 2 - Math.PI / 2
        let v = 0.04
        if (bins) {
          const bin = Math.round(Math.pow(maxBin, t))
          v = Math.max(0.04, bins[Math.min(bins.length - 1, bin)] / 255)
        }
        const inner = base * (1.05 + levels.bass * 0.35)
        const len = v * base * (0.9 + levels.high * 0.6)
        const c1 = theme.lowColor
        const c2 = theme.highColor
        const r = Math.round((c1.r + (c2.r - c1.r) * t) * 255)
        const g = Math.round((c1.g + (c2.g - c1.g) * t) * 255)
        const b = Math.round((c1.b + (c2.b - c1.b) * t) * 255)
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 + v * 0.65})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
        ctx.lineTo(
          cx + Math.cos(angle) * (inner + len),
          cy + Math.sin(angle) * (inner + len),
        )
        ctx.stroke()
      }
    }

    raf = requestAnimationFrame(draw)
    // QA bridge, mirroring the 3D FramePump for hidden-tab checks
    window.resonance = {
      ...(window.resonance || {}),
      pump2d: (n = 1) => {
        for (let i = 0; i < n; i += 1) draw(performance.now())
      },
    }
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas className="fallback-canvas" ref={ref} aria-hidden="true" />
}
