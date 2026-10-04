// Mounts the book: compiles every spread, starts the press, builds the
// three.js book and the controller, wires pointer and keys, and steps it all
// each frame. Shadows re-render only on frames where paper moved.

import { invalidate, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { SPREADS } from '../spreads/index.js'
import { compileSafe } from '../paper/spread.js'
import { createPress } from './press.js'
import { createBookView } from './bookView.js'
import { createController } from '../book/controller.js'
import { rt, store } from '../state/store.js'
import HoverMark from './HoverMark.jsx'
import { warmUp } from './warmup.js'
import { hashFor, loadRibbon, parseHash, saveRibbon } from '../state/links.js'

function build(gl, tier) {
  const spreads = SPREADS.map((s) => compileSafe(s))
  const press = createPress({ anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()) })
  const view = createBookView({ spreads, press, gl, tier })
  return { spreads, press, view }
}

export default function BookRoot({ tier }) {
  // read the renderer through get(): it is configured imperatively below
  const get = useThree((s) => s.get)
  const [made] = useState(() => build(get().gl, tier))
  const [ctl, setCtl] = useState(null)

  useEffect(() => {
    const { gl, camera } = get()
    const { view, press } = made
    rt.view = view
    rt.press = press
    rt.gl = gl
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    view.onLanded(() => invalidate())
    view.boot()
    // deep links: #sky opens that spread, #day-18 its chapter and bookplate;
    // without one, a returning reader is offered their ribbon
    let pendingDay = null
    let pendingSpread = -2
    let linked = false
    const follow = (link) => {
      if (!link) return
      pendingDay = link.day ?? null
      pendingSpread = link.spread
      if (store.get().spread === link.spread) {
        if (pendingDay) store.set({ bookplate: pendingDay })
        pendingDay = null
      } else {
        c.goto(link.spread)
        // a refused turn (a page in hand) forgets the link
        if (c.book.held >= 0) pendingDay = null
      }
      invalidate()
    }
    const onHash = () => follow(parseHash(location.hash))
    window.addEventListener('hashchange', onHash)
    let lastSpread = store.get().spread
    const unsubLinks = store.subscribe(() => {
      const { spread } = store.get()
      if (spread === lastSpread) return
      lastSpread = spread
      // the book landed: open a linked day's plate only if it landed there
      // (the reader may have turned elsewhere mid-riffle)
      if (pendingDay) {
        if (spread === pendingSpread) store.set({ bookplate: pendingDay })
        pendingDay = null
      }
      if (!linked) return
      const h = hashFor(spread)
      if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search)
      saveRibbon(spread)
      if (spread >= 0 && store.get().ribbon != null) store.set({ ribbon: null })
    })
    // ready once the cover is printed (or failed: the book still opens);
    // then compile every program the book will need while it's still shut
    view.coverReady.finally(() => {
      store.set({ ready: true })
      const link = parseHash(location.hash)
      linked = true
      if (link) follow(link)
      else {
        const r = loadRibbon()
        if (r != null) store.set({ ribbon: r })
      }
      const { scene } = get()
      warmUp(gl, scene, camera).then((n) => {
        rt.programs = n
        invalidate()
      })
    })
    // anything in the coarse UI state can change what is drawn
    const unsub = store.subscribe(() => invalidate())
    const c = createController({ view, camera, dom: gl.domElement })
    rt.ctl = c
    rt.book = c.book
    // the controller is created here, after mount, and handed to the frame loop
    queueMicrotask(() => setCtl(c))
    const el = gl.domElement
    const down = (e) => {
      try {
        el.setPointerCapture?.(e.pointerId)
      } catch {
        /* a pointer the browser no longer tracks: no capture, still handle it */
      }
      c.down(e)
      invalidate()
    }
    const move = (e) => {
      c.move(e)
      invalidate()
    }
    const up = (e) => {
      c.up(e)
      invalidate()
    }
    const cancel = (e) => c.cancel(e)
    const leave = () => {
      rt.pointer.x = 0.5
      rt.pointer.y = 0.5
      c.clearHover()
    }
    const key = (e) => {
      c.key(e)
      invalidate()
    }
    // a lost GPU context (driver reset, the OS reclaiming memory) can't be
    // reprinted in place: say so, and offer a reload
    const lost = (e) => {
      e.preventDefault()
      store.set({ lost: true })
    }
    el.addEventListener('webglcontextlost', lost)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    el.addEventListener('pointerleave', leave)
    window.addEventListener('keydown', key)
    return () => {
      unsub()
      unsubLinks()
      el.removeEventListener('webglcontextlost', lost)
      window.removeEventListener('hashchange', onHash)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('pointerleave', leave)
      window.removeEventListener('keydown', key)
      // (the press and its workers live as long as the page: StrictMode
      // re-runs this effect, and a disposed press would print nothing)
    }
  }, [made, get])

  useFrame((state, dt) => {
    if (!ctl) return
    const moving = ctl.tick(Math.min(rt.fixedDt ?? dt, 1 / 20))
    const holding = ctl.holding === 'page' || ctl.holding === 'mech'
    const visible = made.view.update(ctl.book, ctl.values, holding || moving)
    if (moving || rt.shadowsDirty) {
      state.gl.shadowMap.needsUpdate = true
      rt.shadowsDirty = false
    }
    // readouts that follow the paper (the x-ray angle) update on drawn frames
    rt.onFrame?.()
    // the canvas only renders while something changes (frameloop "demand")
    if (moving || visible.uploading || ctl.holding) state.invalidate()
  })

  return (
    <>
      <primitive object={made.view.root} />
      <HoverMark />
    </>
  )
}
