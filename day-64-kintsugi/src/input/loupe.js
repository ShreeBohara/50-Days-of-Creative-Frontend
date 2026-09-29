// The loupe: hold Alt (or long-press empty space on touch) and the view
// becomes a 6× macro lens centred on the pointer — pinholes, crawled glaze,
// the grain of the gold. It's camera.setViewOffset on the main view, so it
// costs nothing extra to render. State lives on rt.loupe; CameraRig applies it.

import { rt } from '../state/store.js'

const LONG_PRESS_MS = 450

export function bindLoupe(canvas) {
  const l = (rt.loupe = { active: false, x: 0, y: 0, amt: 0 })
  let press = null
  const pos = (e) => {
    const r = canvas.getBoundingClientRect()
    l.x = e.clientX - r.left
    l.y = e.clientY - r.top
  }
  const move = (e) => {
    pos(e)
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10 && !l.active) {
      clearTimeout(press.timer)
      press = null
    }
  }
  const down = (e) => {
    pos(e)
    // long-press on empty canvas (nothing claimed it) opens the loupe on touch
    if (press) clearTimeout(press.timer)
    press = null
    if (e.pointerType !== 'touch' || !e.isPrimary || e.__kintsugiHit || e.target !== canvas) return
    press = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        // a hold that a bowl lift, a dragged shard, a spin or a tool owns is not a loupe
        if (rt.held || rt.fit?.hold || rt.fit?.spin || rt.craft?.tool || rt.veil?.grabbed) return
        l.active = true
      }, LONG_PRESS_MS),
    }
  }
  const up = () => {
    if (press) clearTimeout(press.timer)
    press = null
    if (!l.alt) l.active = false
  }
  const key = (e) => {
    if (e.key !== 'Alt') return
    e.preventDefault()
    l.alt = e.type === 'keydown'
    l.active = l.alt
  }
  const blur = () => {
    l.alt = false
    l.active = false
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerdown', down)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  window.addEventListener('keydown', key)
  window.addEventListener('keyup', key)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerdown', down)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('keydown', key)
    window.removeEventListener('keyup', key)
    window.removeEventListener('blur', blur)
  }
}
