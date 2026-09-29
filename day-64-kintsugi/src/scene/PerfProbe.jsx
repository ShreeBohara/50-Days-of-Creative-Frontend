import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { store } from '../state/store.js'

// ?perf=1 only: a frame-pacing log tagged with the ritual phase, for checking
// smoothness on a real display. In the console:
//   __perf.table()   per phase: frames, p50/p95/max frame interval, hitches,
//                    shader programs compiled during that phase
//   __perf.reset()
class Probe {
  constructor() {
    this.reset()
  }

  reset() {
    this.last = 0
    this.rows = new Map()
    this.vsync = []
  }

  row(phase) {
    let r = this.rows.get(phase)
    if (!r) this.rows.set(phase, (r = { d: [], hitches: 0, programs0: null, programs: 0 }))
    return r
  }

  frame(gl, now) {
    const phase = store.get().phase
    const programs = gl.info.programs?.length ?? 0
    const r = this.row(phase)
    r.programs0 ??= programs
    r.programs = programs
    if (this.last) {
      const d = now - this.last
      if (this.vsync.length < 120) this.vsync.push(d)
      r.d.push(d)
      const v = this.interval()
      if (d > v * 1.5 && d < 1000) r.hitches++
    }
    this.last = now
  }

  interval() {
    if (!this.vsync.length) return 16.7
    const s = [...this.vsync].sort((a, b) => a - b)
    return s[s.length >> 1]
  }

  table() {
    const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? 0
    const out = {}
    for (const [phase, r] of this.rows) {
      const s = [...r.d].sort((a, b) => a - b)
      out[phase] = {
        frames: s.length,
        p50: +q(s, 0.5).toFixed(1),
        p95: +q(s, 0.95).toFixed(1),
        max: +(s[s.length - 1] ?? 0).toFixed(1),
        hitches: r.hitches,
        newPrograms: r.programs - r.programs0,
      }
    }
    console.table(out)
    return out
  }
}

export default function PerfProbe() {
  const gl = useThree((s) => s.gl)
  const probe = useMemo(() => new Probe(), [])
  useEffect(() => {
    window.__perf = { table: () => probe.table(), reset: () => probe.reset(), vsync: () => probe.interval() }
    const hide = () => document.visibilityState === 'hidden' && (probe.last = 0) // a hidden tab isn't a hitch
    document.addEventListener('visibilitychange', hide)
    return () => {
      delete window.__perf
      document.removeEventListener('visibilitychange', hide)
    }
  }, [probe])
  useFrame(() => probe.frame(gl, performance.now()), 2)
  return null
}
