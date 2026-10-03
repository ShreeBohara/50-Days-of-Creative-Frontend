// ?perf=1: frame pacing per activity (idle, turning, mechanism, riffle),
// measured with requestAnimationFrame timestamps — the real pacing, not the
// GPU's guess. window.__perf.table() prints p50 / p95 / max per activity.
import { useEffect } from 'react'
import { rt } from '../state/store.js'

export default function PerfProbe() {
  useEffect(() => {
    const buckets = new Map()
    let last = 0
    let raf = 0
    const tick = (t) => {
      if (last) {
        const dt = t - last
        const holding = rt.ctl?.holding
        const book = rt.book
        const phase = book?.queue?.length ? 'riffle' : holding === 'page' ? 'turning' : holding === 'mech' ? 'mechanism' : holding === 'draw' ? 'drawing' : book && Array.from(book.vel).some((v) => Math.abs(v) > 0.05) ? 'settling' : 'idle'
        if (!buckets.has(phase)) buckets.set(phase, [])
        const b = buckets.get(phase)
        b.push(dt)
        if (b.length > 4000) b.shift()
      }
      last = t
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]
    window.__perf = {
      table() {
        const rows = {}
        for (const [k, v] of buckets) {
          const a = [...v].sort((x, y) => x - y)
          rows[k] = { frames: a.length, p50: +q(a, 0.5).toFixed(1), p95: +q(a, 0.95).toFixed(1), max: +a[a.length - 1].toFixed(1), over20ms: a.filter((x) => x > 20).length }
        }
        console.table(rows)
        return rows
      },
      reset: () => buckets.clear(),
    }
    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}
