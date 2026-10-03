// The press: prints pages, card sheets and covers in a worker (falling back
// to the main thread, a job per macrotask, where a worker can't print), and
// hands back three.js textures. Jobs are prioritised: the spread the reader is
// about to see comes first, idle look-ahead last.

import * as THREE from 'three'
import { SPREADS } from '../spreads/index.js'
import { COVER } from '../spreads/cover.js'
import { compileSafe } from '../paper/spread.js'

const COLOR = THREE.SRGBColorSpace

function toTexture(img, anisotropy) {
  const tex = new THREE.Texture(img)
  tex.colorSpace = COLOR
  // every uv in the book uses canvas orientation (v down), so never flip
  tex.flipY = false
  tex.anisotropy = anisotropy
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

export function createPress({ anisotropy = 8, workers: want = 2 } = {}) {
  // a small pool: the spread being turned to prints its pages on one worker
  // while its card sheet prints on another
  const pool = [] // { worker, busy }
  let mode = 'pending' // 'worker' | 'local'
  let local = null
  let localBusy = false
  const waiting = new Map()
  const log = [] // press run times, for ?debug QA
  const queue = []
  let seq = 0

  const ready = new Promise((resolve) => {
    let hellos = 0
    let settled = false
    const timer = setTimeout(() => (pool.length ? settle(true) : fallback(resolve)), 4000)
    const settle = (ok) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (ok) {
        mode = 'worker'
        resolve()
      } else fallback(resolve)
    }
    const n = Math.max(1, Math.min(want, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2))
    try {
      for (let i = 0; i < n; i++) {
        const w = new Worker(new URL('../art/printer.worker.js', import.meta.url), { type: 'module' })
        const slot = { worker: w, busy: false, ok: false }
        w.onmessage = ({ data }) => {
          if (data.hello) {
            slot.ok = data.supported
            if (data.supported) pool.push(slot)
            hellos++
            if (hellos === n) settle(pool.length > 0)
            return
          }
          const job = waiting.get(data.id)
          waiting.delete(data.id)
          slot.busy = false
          if (job) {
            log.push({ kind: job.kind, spread: job.spread, ms: Math.round(performance.now() - job.started) })
            if (data.ok) job.resolve(data.blob ?? data.bitmaps)
            else job.reject(new Error(data.error))
          }
          pump()
        }
        w.onerror = () => {
          slot.busy = false
          hellos++
          if (hellos === n) settle(pool.length > 0)
        }
      }
    } catch {
      settle(false)
    }
  })

  async function fallback(resolve) {
    if (mode === 'local') return resolve()
    for (const slot of pool) slot.worker.terminate()
    pool.length = 0
    mode = 'local'
    // the same jobs, on this thread
    const { printAtlas, printCover, printPages } = await import('../art/jobs.js')
    const compiled = new Map()
    const get = (k) => {
      if (!compiled.has(k)) compiled.set(k, compileSafe(SPREADS[k]))
      return compiled.get(k)
    }
    const { renderTemplate } = await import('../art/template.js')
    local = (job) => {
      if (job.kind === 'template') {
        const c = renderTemplate(get(job.spread), job.res ?? 100)
        return c.convertToBlob ? c.convertToBlob({ type: 'image/png' }) : new Promise((r) => c.toBlob(r, 'image/png'))
      }
      if (job.kind === 'pages') {
        const p = printPages(get(job.spread), job.res)
        return [p.L, p.R]
      }
      if (job.kind === 'atlas') return [printAtlas(get(job.spread), job.px)]
      const c = printCover(COVER, job.res)
      return [c.front, c.back]
    }
    resolve()
    pump()
  }

  function pump() {
    if (mode === 'pending') return
    queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq)
    while (queue.length) {
      if (queue[0].cancelled) {
        queue.shift()
        continue
      }
      if (mode === 'worker') {
        const slot = pool.find((sl) => !sl.busy)
        if (!slot) return
        const job = queue.shift()
        slot.busy = true
        job.started = performance.now()
        waiting.set(job.id, job)
        slot.worker.postMessage({ id: job.id, kind: job.kind, spread: job.spread, res: job.res, px: job.px })
      } else {
        if (localBusy) return
        const job = queue.shift()
        localBusy = true
        job.started = performance.now()
        setTimeout(() => {
          try {
            job.resolve(local(job))
          } catch (err) {
            job.reject(err)
          }
          localBusy = false
          pump()
        }, 0)
        return
      }
    }
  }

  /**
   * print({ kind, spread, res | px }, priority) → Promise<THREE.Texture[]>
   * Lower priority numbers print first. The promise also carries cancel().
   */
  function print(spec, priority = 5) {
    let job
    const p = new Promise((resolve, reject) => {
      job = { ...spec, id: ++seq, seq, priority, resolve, reject, cancelled: false }
    }).then((out) => (spec.kind === 'template' ? out : out.map((img) => toTexture(img, anisotropy))))
    queue.push(job)
    ready.then(pump)
    p.cancel = () => {
      job.cancelled = true
    }
    p.reprioritise = (n) => {
      job.priority = n
    }
    return p
  }

  return {
    print,
    ready,
    get mode() {
      return mode
    },
    pending: () => queue.length + waiting.size + (localBusy ? 1 : 0),
    log,
    dispose() {
      for (const slot of pool) slot.worker.terminate()
    },
  }
}
