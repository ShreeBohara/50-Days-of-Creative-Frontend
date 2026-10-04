// The reader's hands. Turns pointer and keyboard input into page turns,
// mechanism moves and taps, steps every spring, and reports sound cues.
//
// Dragging uses the same trick for everything: each movable thing has one
// degree of freedom (a leaf's angle, a flap's lift, a wheel's turn, a tab's
// pull) and a closed-form pose, so the controller simply searches for the
// value that puts the grabbed point of paper under the pointer.

import * as THREE from 'three'
import { H, W } from '../paper/dims.js'
import { poseSpread, restValue } from '../paper/spread.js'
import { toWorld } from '../paper/kinematics.js'
import { beginDrag, createBook, drag, openSpread, release, restAngle, settleNow, spreadAlpha, step, turnTo } from './model.js'
import { audio } from '../audio/engine.js'
import { rt, store } from '../state/store.js'
import { SPREADS } from '../spreads/index.js'

const TAP_PX = 7
const MECH_KINDS = new Set(['flap', 'wheel', 'slider'])

/**
 * 1-D search: a coarse scan, then a golden-section refine that reuses one
 * evaluation per step (a drag runs this on every pointer move, and each
 * evaluation of a mechanism poses its whole spread).
 */
function search(cost, lo, hi, samples = 32) {
  let best = lo
  let bestC = Infinity
  for (let i = 0; i <= samples; i++) {
    const t = lo + ((hi - lo) * i) / samples
    const c = cost(t)
    if (c < bestC) {
      bestC = c
      best = t
    }
  }
  let a = Math.max(lo, best - (hi - lo) / samples)
  let b = Math.min(hi, best + (hi - lo) / samples)
  const g = 0.618034
  let x1 = b - g * (b - a)
  let x2 = a + g * (b - a)
  let f1 = cost(x1)
  let f2 = cost(x2)
  for (let i = 0; i < 16; i++) {
    if (f1 < f2) {
      b = x2
      x2 = x1
      f2 = f1
      x1 = b - g * (b - a)
      f1 = cost(x1)
    } else {
      a = x1
      x1 = x2
      f1 = f2
      x2 = a + g * (b - a)
      f2 = cost(x2)
    }
  }
  return (a + b) / 2
}

export function createController({ view, camera, dom }) {
  const S = view.sheets.length
  const book = createBook(S)
  // mechanism state per spread: pieceId → { v, vel, target, kind }
  const mech = view.sheets.map(({ spread }) => {
    const m = new Map()
    for (const p of spread.pieces) {
      if (MECH_KINDS.has(p.kind)) m.set(p.id, { v: restValue(p), vel: 0, target: restValue(p), kind: p.kind, piece: p })
    }
    return m
  })
  const mechValues = mech.map(() => ({}))
  const values = (k) => {
    const out = mechValues[k]
    for (const [id, s] of mech[k]) out[id] = s.v
    return out
  }

  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const v3 = new THREE.Vector3()
  let hold = null // what the pointer is doing
  let lastOpen = -2
  const opened = new Set() // spreads whose pieces already popped this opening
  let landing = new Float64Array(S) // peak speed per leaf while it moves

  // ------------------------------------------------------------ geometry
  // the canvas size is read once per pointer event, not per projection
  let rect = { width: 1, height: 1 }
  function toScreen(p) {
    v3.set(p[0], p[1], p[2]).project(camera)
    return [(v3.x * 0.5 + 0.5) * rect.width, (-v3.y * 0.5 + 0.5) * rect.height]
  }
  function setRay(x, y) {
    const r = dom.getBoundingClientRect()
    rect = r
    ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }

  /** What is under the pointer: a mechanism, a tappable day, a page, or nothing. */
  function pick(x, y) {
    setRay(x, y)
    const targets = []
    for (const sh of view.sheets) if (sh.group.visible) targets.push(...sh.meshes)
    const g = book.turned
    if (g < S) targets.push(view.leaves[g])
    if (g > 0) targets.push(view.leaves[g - 1])
    if (g === S) targets.push(view.backBoard)
    const hits = ray.intersectObjects(targets, false)
    const hit = hits[0]
    if (!hit) return null
    const o = hit.object
    const describe = (h) => {
      const ob = h.object
      const k = ob.userData.spread
      const spread = view.sheets[k].spread
      const piece = spread.byId.get(ob.userData.piece)
      const local = ob.worldToLocal(h.point.clone())
      const card = [local.x, -local.y]
      const driver = MECH_KINDS.has(piece.kind) ? piece : piece.drive ? spread.byId.get(piece.drive.by) : null
      return { k, piece, driver, card, panel: ob.userData.key, point: h.point.clone() }
    }
    if (o.userData.piece) {
      const d = describe(hit)
      if (d.piece.draw && hit.face?.materialIndex === 0 && view.drawing) return { type: 'draw', ...d, mesh: o }
      if (!d.driver && d.piece.on.includes(':')) {
        // a card lying flat over a mechanism (a window over a wheel, a label
        // on a tab): drags reach the mechanism beneath, taps stay with the card
        const under = hits.slice(1).find((h2) => h2.distance - hit.distance < 0.5 && h2.object.userData.piece)
        if (under) {
          const u = describe(under)
          if (u.driver) return { type: 'mech', ...u, tapDay: d.piece.day }
        }
      }
      return { type: d.driver ? 'mech' : d.piece.day ? 'piece' : 'popup', ...d, day: d.piece.day }
    }
    // a leaf (or the back board): which printed page, and where on it
    const leaf = o === view.backBoard ? S : o.userData.leaf
    const local = o.worldToLocal(hit.point.clone())
    const d = local.x
    const yPage = local.z + H / 2
    const front = hit.face?.materialIndex === 0
    let k
    let side
    if (front) {
      k = leaf - 1
      side = 'R'
    } else {
      k = leaf
      side = 'L'
    }
    if (leaf === 0 && front) return { type: 'cover', leaf: 0, point: hit.point.clone(), r: d, z: local.z }
    const px = side === 'R' ? d : W - d
    const spot = (SPREADS[k]?.spots ?? []).find((s) => {
      if (s.on !== `page:${side}`) return false
      const [sx, sy, sw, sh] = s.rect
      return px >= sx && px <= sx + sw && yPage >= sy && yPage <= sy + sh
    })
    return { type: spot ? 'spot' : 'page', k, side, spot, leaf: leaf === S ? null : leaf, point: hit.point.clone(), r: d, z: local.z, px, py: yPage }
  }

  // ------------------------------------------------------------ actions
  function turn(dir) {
    if (book.held >= 0) return
    const next = openSpread(book) + dir
    if (next < -1 || next > S - 1) return
    goto(next)
  }

  function goto(k) {
    if (book.held >= 0) return
    const from = openSpread(book)
    const to = Math.max(-1, Math.min(S - 1, k))
    if (!turnTo(book, to)) return
    closeFlaps(from)
    // reduced motion: arrive, don't riffle
    if (rt.reduced && Math.abs(to - from) > 1) {
      settleNow(book)
      rt.shadowsDirty = true // nothing moved this frame, but everything changed
    }
    audio.unlock()
    audio.turnStart(to > from ? 1 : -1)
    // the front board is in the riffle: its thump lands as it settles
    if (from === -1 || to === -1) audio.cover(to > from, 0.5)
  }

  function closeFlaps(k) {
    if (k < 0) return
    for (const s of mech[k].values()) if (s.kind === 'flap') s.target = 0
  }

  function tapMech(m) {
    const s = mech[m.k].get(m.driver.id)
    if (s.kind === 'flap') {
      s.target = s.v > Math.PI / 2 || s.target > Math.PI / 2 ? 0 : Math.PI * 0.97
      audio.flap(s.target > 0)
    } else if (s.kind === 'wheel') {
      s.vel += 240
    } else if (s.kind === 'slider') {
      s.target = s.v > 0.5 ? 0 : 1
      s.free = false
    }
  }

  function tapSpot(h) {
    if (h.spot?.goto != null) return goto(h.spot.goto)
    if (h.spot?.day) store.set({ bookplate: h.spot.day })
  }

  // ------------------------------------------------------------ pointer
  function down(e) {
    // one hand at a time: a second finger (a pinch, a palm) or a right-click
    // never takes over a gesture already in progress
    if (hold || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return
    const r = dom.getBoundingClientRect()
    rect = r
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    audio.unlock()
    if (store.get().bookplate || store.get().lost) return
    if (book.queue.length) return
    const h = pick(x, y)
    hold = { x0: x, y0: y, x, y, t0: performance.now(), hit: h, mode: 'press', id: e.pointerId }
    if (h?.type === 'draw') {
      hold.mode = 'draw'
      hold.last = performance.now()
      view.drawing.begin(h.card[0], h.card[1])
      store.set({ drawing: true })
    }
  }

  /** Card coordinates on the drawable card under the pointer, or null. */
  function drawPoint(x, y) {
    setRay(x, y)
    const meshes = view.sheets[view.drawing.spread].meshes.filter((m) => m.userData.piece === view.drawing.piece)
    const hit = ray.intersectObjects(meshes, false)[0]
    if (!hit || hit.face?.materialIndex !== 0) return null
    const local = hit.object.worldToLocal(hit.point.clone())
    return [local.x, -local.y]
  }

  function startMech(h) {
    const s = mech[h.k].get(h.driver.id)
    hold.mode = 'mech'
    hold.mech = { ...h, state: s, start: s.v }
    s.held = true
  }

  function startPage(h) {
    // the leaf actually under the finger when a page was hit; otherwise (a
    // pop-up) the top of the stack on that side of the spine
    const right = h.point.x >= 0
    let leaf = h.leaf != null && (h.leaf === book.turned || h.leaf === book.turned - 1) ? h.leaf : right ? book.turned : book.turned - 1
    if (leaf < 0 || leaf >= S) return false
    if (!beginDrag(book, leaf)) return false
    closeFlaps(openSpread(book))
    // grab the point where the pointer's ray meets that leaf's own plane, so
    // the first step doesn't leap to where a standing pop-up happened to be
    const phi = book.phi[leaf]
    setRay(hold.x0, hold.y0)
    const n = new THREE.Vector3(-Math.sin(phi), Math.cos(phi), 0)
    const denom = ray.ray.direction.dot(n)
    let px = h.point
    if (Math.abs(denom) > 1e-4) {
      const t = -ray.ray.origin.dot(n) / denom
      if (t > 0) px = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t)
    }
    const r = Math.max(6, Math.hypot(px.x, px.y))
    hold.mode = 'page'
    hold.page = { leaf, r, z: THREE.MathUtils.clamp(px.z, -H / 2, H / 2) }
    audio.turnStart(leaf >= book.turned ? 1 : -1)
    if (leaf === 0) audio.cover(book.turned === 0, 0.5)
    return true
  }

  function move(e) {
    if (hold && hold.id != null && e.pointerId !== hold.id) return
    const r = dom.getBoundingClientRect()
    rect = r
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    rt.pointer.x = x / r.width
    rt.pointer.y = y / r.height
    if (!hold) {
      hoverAt(x, y)
      return
    }
    hold.x = x
    hold.y = y
    if (hold.mode === 'press') {
      if (Math.hypot(x - hold.x0, y - hold.y0) < TAP_PX * (e.pointerType === 'touch' ? 1.5 : 1)) return
      const h = hold.hit
      if (h?.type === 'mech') startMech(h)
      else if (h && (h.type === 'page' || h.type === 'spot' || h.type === 'piece' || h.type === 'popup' || h.type === 'cover')) {
        if (!startPage(h)) hold.mode = 'orbit'
      } else hold.mode = 'orbit'
      if (hold.mode === 'orbit') rt.orbit?.begin(x, y)
    }
    if (hold.mode === 'draw') {
      const p = drawPoint(x, y)
      const now = performance.now()
      if (p) audio.scratch(view.drawing.to(p[0], p[1], (now - hold.last) / 1000))
      hold.last = now
      return
    }
    if (hold.mode === 'page') {
      const first = !hold.page.moved
      dragPage(x, y)
      // the step that crosses the tap threshold is a catch-up, not a flick
      if (first) {
        hold.page.moved = true
        book.vel[hold.page.leaf] = 0
      }
    } else if (hold.mode === 'mech') dragMech(x, y)
    else if (hold.mode === 'orbit') rt.orbit?.move(x, y)
  }

  function dragPage(x, y) {
    const { leaf, r, z } = hold.page
    const lo = restAngle(book, leaf, leaf)
    const hi = restAngle(book, leaf, leaf + 1)
    const cur = book.phi[leaf]
    const cost = (p) => {
      const s = toScreen([r * Math.cos(p), r * Math.sin(p), z])
      return (s[0] - x) ** 2 + (s[1] - y) ** 2
    }
    const p = search(cost, Math.max(lo, cur - 1.2), Math.min(hi, cur + 1.2), 36)
    drag(book, p, rt.dt || 1 / 60)
  }

  function dragMech(x, y) {
    const m = hold.mech
    const s = m.state
    const sh = view.sheets[m.k]
    const [l, rr] = [book.phi[m.k], m.k + 1 < S ? book.phi[m.k + 1] : 0]
    const vals = { ...values(m.k) }
    const cost = (v) => {
      vals[m.driver.id] = v
      const pose = poseSpread(sh.spread, l, rr, vals)
      const f = pose.frames.get(m.panel)
      if (!f) return Infinity
      const s2 = toScreen(toWorld(f, m.card[0], m.card[1]))
      return (s2[0] - x) ** 2 + (s2[1] - y) ** 2
    }
    let v
    if (s.kind === 'flap') v = search(cost, 0, Math.PI * 0.985, 40)
    else if (s.kind === 'slider') v = search(cost, 0, 1, 40)
    else v = search(cost, s.v - 120, s.v + 120, 48)
    const dt = rt.dt || 1 / 60
    // smoothed, so the jitter of a hand letting go doesn't read as a flick
    s.vel = s.vel * 0.65 + ((v - s.v) / dt) * 0.35
    s.v = v
    s.target = v
  }

  function up(e) {
    if (!hold || (hold.id != null && e.pointerId !== hold.id)) return
    const h = hold.hit
    const dt = (performance.now() - hold.t0) / 1000
    if (hold.mode === 'draw') {
      view.drawing.end()
      audio.scratch(0)
      store.set({ drawing: false, strokes: view.drawing.count })
      hold = null
      return
    }
    if (hold.mode === 'press') {
      // a tap
      if (h?.type === 'mech') {
        if (h.tapDay) store.set({ bookplate: h.tapDay })
        else tapMech(h)
      }
      else if (h?.type === 'spot') tapSpot(h)
      else if (h?.type === 'piece') store.set({ bookplate: h.day })
      else if (h?.type === 'cover') turn(1)
      else if (h?.type === 'page' && dt < 0.5) turn(h.side === 'R' ? 1 : -1)
    } else if (hold.mode === 'mech') {
      const s = hold.mech.state
      s.held = false
      if (s.kind === 'flap') {
        const fling = s.vel
        s.target = fling > 7 ? Math.PI * 0.97 : fling < -7 ? 0 : s.v > Math.PI / 2 ? Math.PI * 0.97 : 0
        audio.flap(s.target > 0)
      } else if (s.kind === 'slider') {
        s.target = s.v < 0.08 ? 0 : s.v > 0.92 ? 1 : s.v
        s.vel = 0
      } else {
        s.vel = Math.max(-720, Math.min(720, s.vel))
      }
    } else if (hold.mode === 'page') {
      release(book)
    } else if (hold.mode === 'orbit') {
      rt.orbit?.end()
    }
    hold = null
    if (store.get().bookplate) setHover(null)
  }

  /** The OS took the pointer away (a system gesture, a call): end what was
   *  in progress, but never fire the tap it might have been. */
  function cancel(e) {
    if (!hold || (hold.id != null && e.pointerId !== hold.id)) return
    if (hold.mode === 'draw') {
      view.drawing.end()
      audio.scratch(0)
      store.set({ drawing: false, strokes: view.drawing.count })
    } else if (hold.mode === 'mech') {
      const s = hold.mech.state
      s.held = false
      s.vel = 0
      if (s.kind === 'flap') s.target = s.v > Math.PI / 2 ? Math.PI * 0.97 : 0
      else s.target = s.v
    } else if (hold.mode === 'page') {
      release(book, 0)
    } else if (hold.mode === 'orbit') {
      rt.orbit?.end()
    }
    hold = null
  }

  function clearHover() {
    setHover(null)
  }

  function hoverAt(x, y) {
    if (book.queue.length || store.get().bookplate) {
      setHover(null)
      return
    }
    const h = pick(x, y)
    setHover(h)
  }

  function setHover(h) {
    let cursor = 'default'
    if (h?.type === 'draw') cursor = 'crosshair'
    else if (h?.type === 'mech') cursor = 'grab'
    else if (h?.type === 'spot' || h?.type === 'piece' || h?.type === 'cover') cursor = 'pointer'
    else if (h?.type === 'page' || h?.type === 'popup') cursor = 'grab'
    if (store.get().cursor !== cursor) store.set({ cursor })
    rt.hover = h
  }

  /** Work a mechanism of the open spread without a pointer: lift/drop a
   *  flap, give a wheel a spin, pull/push a tab. */
  function operate(id) {
    const k = openSpread(book)
    const s = k >= 0 ? mech[k].get(id) : null
    if (!s || book.held >= 0) return
    tapMech({ k, driver: s.piece })
  }

  // ------------------------------------------------------------ keyboard
  function key(e) {
    if (store.get().lost) return
    if (e.target?.closest?.('input, textarea, [contenteditable]')) return
    if (store.get().bookplate) {
      if (e.key === 'Escape') store.set({ bookplate: null })
      return
    }
    if (e.key === 'Escape' && (store.get().keys || store.get().contents)) {
      store.set({ keys: false, contents: false })
      return
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      turn(1)
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      turn(-1)
      e.preventDefault()
    } else if (e.key === 'x' || e.key === 'X') store.set({ xray: !store.get().xray })
    else if (e.key === '?') store.set({ keys: !store.get().keys, contents: false })
    else if (/^[0-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // 0 opens the book at its contents, 1–9 at chapters I–IX
      goto(Number(e.key))
    } else if (e.key === 'Home') goto(-1)
    else if (e.key === 'End') goto(S - 1)
  }

  // ------------------------------------------------------------ stepping
  function stepMech(k, dt) {
    let moving = false
    for (const s of mech[k].values()) {
      if (s.held) {
        moving = true
        if (s.kind === 'slider') audio.slide(Math.min(1, Math.abs(s.vel) / 3))
        continue
      }
      const before = s.v
      if (s.kind === 'wheel') {
        // free spin with friction, click per 15°
        s.v += s.vel * dt
        s.vel *= Math.exp(-2.2 * dt)
        if (Math.abs(s.vel) < 2) s.vel = 0
      } else {
        const w = s.kind === 'flap' ? 11 : 14
        const x = s.v - s.target
        const e2 = Math.exp(-w * dt)
        const c = s.vel + w * x
        s.v = s.target + (x + c * dt) * e2
        s.vel = (s.vel - w * c * dt) * e2
        if (Math.abs(s.v - s.target) < 1e-4 && Math.abs(s.vel) < 1e-3) {
          s.v = s.target
          s.vel = 0
        }
      }
      if (s.kind === 'wheel' && Math.floor(before / 15) !== Math.floor(s.v / 15)) audio.tick()
      if (s.v !== before) moving = true
    }
    // wheels tick while dragged too
    for (const s of mech[k].values()) {
      if (s.held && s.kind === 'wheel' && Math.floor((s.v - s.vel * dt) / 15) !== Math.floor(s.v / 15)) audio.tick()
    }
    // a printed record plays while it spins (only on the open spread)
    for (const s of mech[k].values()) {
      if (s.kind !== 'wheel' || (s.piece.sound !== 'record' && s.piece.id !== 'record')) continue
      const spinning = k === openSpread(book) && Math.abs(s.vel) > 25
      if (spinning !== !!s.playing) {
        s.playing = spinning
        audio.record(spinning)
      }
    }
    return moving
  }

  function tick(dt) {
    rt.dt = dt
    let moving = step(book, dt)
    // sound of leaves in motion
    let speed = 0
    let pan = 0
    for (let i = 0; i < S; i++) {
      const v = Math.abs(book.vel[i])
      if (v > speed) {
        speed = v
        pan = Math.cos(book.phi[i])
      }
      if (v > 0.4) landing[i] = Math.max(landing[i], v)
      else if (landing[i] > 0 && Math.abs(book.phi[i] - book.target[i]) < 0.01 && i !== book.held) {
        audio.turnLand(book.phi[i] > Math.PI / 2 ? -1 : 1, Math.min(1, landing[i] / 8))
        landing[i] = 0
      }
    }
    audio.turnMove(speed, pan)
    // mechanisms of every visible spread; a shut spread's flaps lie flat
    for (let k = 0; k < S; k++) {
      if (!mech[k].size) continue
      if (spreadAlpha(book, k) > 0.02) moving = stepMech(k, dt) || moving
      else {
        for (const st of mech[k].values()) {
          if (st.kind === 'flap' && !st.held && (st.v !== 0 || st.target !== 0)) {
            st.v = st.target = st.vel = 0
          }
        }
      }
    }
    // pop sounds as a spread opens past ~100°
    for (let k = 0; k < S; k++) {
      const a = spreadAlpha(book, k)
      if (a > 1.75 && !opened.has(k)) {
        opened.add(k)
        const pieces = view.sheets[k].spread.pieces.filter((p) => p.on === 'gutter')
        // the engine ripples simultaneous pops out itself
        for (const p of pieces.slice(0, 6)) audio.pop(0, Math.min(1, p.box.h / 14))
      } else if (a < 0.6) opened.delete(k)
    }
    const open = openSpread(book)
    if (open !== lastOpen) {
      // music stops when its page turns away
      for (const m of mech) {
        for (const st of m.values()) {
          if (st.playing) {
            st.playing = false
            audio.record(false)
          }
        }
      }
    }
    if (open !== lastOpen && book.queue.length === 0) {
      const heading = open - lastOpen
      lastOpen = open
      const s = SPREADS[open]
      store.set({
        spread: open,
        announce: open < 0 ? 'The book is shut.' : `Spread ${open + 1} of ${S}: ${s.title}.`,
      })
      view.residency(Math.max(0, open), heading)
    }
    return moving || speed > 0.01
  }

  return {
    book,
    mech,
    values,
    /** hit-test a canvas-relative point (QA) */
    pick,
    down,
    move,
    up,
    cancel,
    clearHover,
    operate,
    key,
    tick,
    turn,
    goto,
    get holding() {
      return hold?.mode ?? null
    },
  }
}
