// ?debug=1 exposes window.__d65 for QA: the hidden preview pane pauses
// requestAnimationFrame, so frames can be pumped by hand.
import { invalidate, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { rt, store } from '../state/store.js'
import { toWorld } from '../paper/kinematics.js'
import * as THREE from 'three'

export default function DebugHandle() {
  const advance = useThree((s) => s.advance)
  const get = useThree((s) => s.get)
  useEffect(() => {
    let clock = performance.now()
    window.__d65 = {
      rt,
      store,
      /** render n frames of 1/60 s */
      pump(n = 1) {
        // R3F measures delta with its own clock, which barely moves inside a
        // loop — so pumped frames carry a fixed 1/60 s
        rt.fixedDt = 1 / 60
        for (let i = 0; i < n; i++) {
          clock += 1000 / 60
          advance(clock, true)
        }
        rt.fixedDt = null
      },
      /**
       * Render a frame and keep it as an image (the drawing buffer is only
       * valid inside the task that rendered it). show() pins the last snap
       * over the page, so a screenshot at any pane size can see it.
       */
      snap(n = 1) {
        this.pump(n)
        this.last = get().gl.domElement.toDataURL('image/jpeg', 0.92)
        return this.last.length
      },
      /**
       * Visit spreads, wait for their full prints, and tile a frame of each
       * into one contact sheet (kept as `last` for show()).
       */
      async tour(list, { w = 640, h = 400, cols = 3 } = {}) {
        const { rt: r } = window.__d65
        const sheet = document.createElement('canvas')
        sheet.width = w * cols
        sheet.height = h * Math.ceil(list.length / cols)
        const g = sheet.getContext('2d')
        g.fillStyle = '#111'
        g.fillRect(0, 0, sheet.width, sheet.height)
        for (let i = 0; i < list.length; i++) {
          const k = list[i]
          r.ctl.goto(k)
          this.pump(200)
          for (let t = 0; t < 80; t++) {
            const e = r.view.entries[k]
            if (e.pages.tex[2] && (!e.sheet || e.sheet.tex[2]) && !r.view.uploading) break
            await new Promise((res) => setTimeout(res, 100))
            this.pump(2)
          }
          this.pump(30)
          const c = get().gl.domElement
          g.drawImage(c, (i % cols) * w, Math.floor(i / cols) * h, w, h)
          g.fillStyle = '#ffe800'
          g.font = '16px monospace'
          g.fillText(`spread ${k}`, (i % cols) * w + 8, Math.floor(i / cols) * h + 20)
        }
        this.last = sheet.toDataURL('image/jpeg', 0.9)
        return this.last.length
      },
      /**
       * Work every reader mechanism on spread k with real pointer events:
       * find a visible point that hits it, drag, let go. Reports its value
       * before, while held and after.
       */
      mechs(k) {
        const r = window.__d65.rt
        r.ctl.goto(k)
        this.pump(220)
        const el = get().gl.domElement
        const rect = el.getBoundingClientRect()
        const sh = r.view.sheets[k]
        const cam = get().camera
        const toScreen = (w) => {
          const v = new THREE.Vector3(...w).project(cam)
          return [(v.x * 0.5 + 0.5) * rect.width, (-v.y * 0.5 + 0.5) * rect.height]
        }
        const ev = (type, x, y) =>
          el.dispatchEvent(new PointerEvent(type, { clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, isPrimary: true, pointerType: 'mouse', bubbles: true, button: 0, buttons: 1 }))
        const out = []
        for (const p of sh.spread.pieces.filter((q) => ['flap', 'wheel', 'slider'].includes(q.kind))) {
          const state = r.ctl.mech[k].get(p.id)
          const pn = p.panels[0]
          const f = sh.pose.frames.get(`${p.id}.${pn.key}`)
          // candidate grab points: a grid over the card's box
          let grab = null
          const b = p.box
          for (let gy = 0.15; gy < 1 && !grab; gy += 0.14) {
            for (let gx = 0.1; gx < 1 && !grab; gx += 0.12) {
              const s2 = toScreen(toWorld(f, b.x0 + b.w * gx, b.y0 + b.h * gy))
              const h = r.ctl.pick(s2[0], s2[1])
              if (h?.type === 'mech' && h.driver.id === p.id) grab = s2
            }
          }
          if (!grab) {
            out.push({ id: p.id, kind: p.kind, error: 'no visible grab point' })
            continue
          }
          const before = state.v
          ev('pointerdown', grab[0], grab[1])
          this.pump(1)
          let peak = before
          for (let i = 1; i <= 14; i++) {
            const t = i / 14
            const x = grab[0] + Math.sin(t * Math.PI) * 60 + t * 90
            const y = grab[1] - t * 140
            ev('pointermove', x, y)
            this.pump(1)
            if (Math.abs(state.v - before) > Math.abs(peak - before)) peak = state.v
          }
          ev('pointerup', grab[0] + 90, grab[1] - 140)
          this.pump(90)
          out.push({ id: p.id, kind: p.kind, before: +before.toFixed(2), peak: +peak.toFixed(2), after: +state.v.toFixed(2) })
        }
        return out
      },
      show(on = true) {
        let img = document.getElementById('__snap')
        if (!img) {
          img = document.createElement('img')
          img.id = '__snap'
          img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;z-index:99;background:#111'
          document.body.appendChild(img)
        }
        img.src = this.last ?? ''
        img.style.display = on ? 'block' : 'none'
        invalidate()
      },
    }
    return () => {
      delete window.__d65
    }
  }, [advance, get])
  return null
}
