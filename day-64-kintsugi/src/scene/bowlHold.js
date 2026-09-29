// Imperative controller for holding the intact bowl: tap-to-ring vs lift,
// the springs the bowl follows, its lean into motion, twist on the wheel,
// release velocity, and first-contact impact classification. Kept outside
// React so per-frame mutation stays out of the render model.

import * as THREE from 'three'
import { audio } from '../audio/engine.js'
import { classifyImpact, SEVERITY } from '../logic/severity.js'
import { TAP_MAX_MS, TAP_SLOP_PX, throwVelocity } from '../logic/gestures.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { BOWL_SLOT } from './geometry.js'
import { BOWL_TOP, bowlRadiusAt } from './cloth.js'
import { facingPlane, pointOnPlane } from '../input/pointer.js'

export const BOWL_HEIGHT = 0.086
const TRAY_X = 0.165
const TRAY_Z = 0.1
const MAX_LIFT = 0.34
const LIFT_ON_GRAB = 0.028 // it rises a little the moment you take it
const MAX_TILT = THREE.MathUtils.degToRad(18)
const MAX_RELEASE = 6.5 // m/s
// Tray.jsx: inner faces of the rolled rim and its height. Only the part of the
// bowl below 12 mm can meet the rim, and it is narrow there (≈32 mm radius).
const WALL_X = 0.198
const WALL_Z = 0.138
const WALL_TOP = 0.012
const FOOT_R = 0.028 // the foot ring: the lowest point when the bowl tips
const CLEAR = 0.002 // never closer than this to the tray or its rim

// The feel of the hand, in one place. Springs are Holden's exact damped
// springs ("Spring-It-On"), frame-rate independent; each is set by a halflife
// (s): roughly how long the distance to its goal takes to halve.
const FEEL = {
  follow: 0.045, // the bowl chasing the pointer (critically damped)
  lean: 0.1, // the lean answering its motion …
  leanZeta: 0.6, // … under-damped: it sways ~10 % past level and settles
  rise: 0.06, // the lift-off once a press becomes a hold …
  riseZeta: 0.75, // … a hair of overshoot for a hand (keys rise at ζ = 1)
  press: 0.03, // the squash under a press that hasn't become a lift yet
  squash: 0.01, // 1 % shorter at full press (the rim dips ~0.9 mm) …
  spread: 0.004, // … and a touch wider
  // rubber band: how far short of each limit the bowl starts to resist (m)
  give: { side: 0.015, floor: 0.006, top: 0.03 },
  // lean per m/s of motion (rad), soft-limited to MAX_TILT with tanh
  leanX: 0.35,
  leanY: 0.05,
  leanZ: 0.4,
}

// Rim + wall + foot sample points (bowl-local) for finding the first contact.
const PROBES = []
for (let i = 0; i < 24; i++) {
  const a = (i / 24) * Math.PI * 2
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.06, 0.085, Math.cos(a) * 0.06))
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.058, 0.045, Math.cos(a) * 0.058))
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.026, 0.0, Math.cos(a) * 0.026))
}

const _v = new THREE.Vector3()
const _goal = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _identity = new THREE.Matrix4()
const LN2x2 = 2 * Math.LN2

// Output of spring(): the new position and velocity.
let sx = 0
let sv = 0

/** One exact step of a damped spring (ζ ≤ 1) from (x, v) toward `goal`. */
function spring(x, v, goal, halflife, zeta, dt) {
  const w = LN2x2 / halflife
  const a = x - goal
  if (zeta < 1) {
    const y = zeta * w
    const wd = w * Math.sqrt(1 - zeta * zeta)
    const b = (v + y * a) / wd
    const e = Math.exp(-y * dt)
    const c = Math.cos(wd * dt)
    const s = Math.sin(wd * dt)
    sx = goal + e * (a * c + b * s)
    sv = e * ((b * wd - y * a) * c - (a * wd + y * b) * s)
  } else {
    const j = v + w * a
    const e = Math.exp(-w * dt)
    sx = goal + e * (a + j * dt)
    sv = e * (v - j * w * dt)
  }
}

// Slope of the last soft() call: how much of the hand's motion got through.
let band = 1

/**
 * Rubber-band clamp: linear until `give` short of a limit, then it eases
 * toward the limit and never reaches it — resistance, not an invisible wall.
 * The slope stays continuous, so the motion just gets heavier.
 */
function soft(x, lo, hi, giveLo, giveHi) {
  const top = hi - giveHi
  const bot = lo + giveLo
  if (top < bot) {
    band = 0 // no room to move at all
    return (lo + hi) / 2
  }
  if (x > top) {
    const u = (x - top) / giveHi
    band = 1 / ((1 + u) * (1 + u))
    return top + (giveHi * u) / (1 + u)
  }
  if (x < bot) {
    const u = (bot - x) / giveLo
    band = 1 / ((1 + u) * (1 + u))
    return bot - (giveLo * u) / (1 + u)
  }
  band = 1
  return x
}

/** How far from centre the bowl may stand, with a tray rim's inner face at `wall`. */
function reach(wall, y, sinT) {
  const low = y - FOOT_R * sinT // lowest point of the tipped foot
  if (low >= WALL_TOP + CLEAR) return Infinity // it clears the rim
  const h = Math.min(BOWL_TOP, WALL_TOP + CLEAR - low) // bowl height level with the rim
  return wall - bowlRadiusAt(h) - h * sinT - CLEAR
}

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

// Pointer samples for the release velocity: a ring, allocated once.
const RING = 32

export class BowlHold {
  constructor() {
    this.h = null
    this.preVel = new THREE.Vector3()
    this.body = null
    this.mesh = null
    this.rapier = null
    this.camera = null
    this.canvas = null
    this.press = 0 // squash spring, 0..1
    this.pressV = 0
    this.ring = Array.from({ length: RING }, () => ({ x: 0, y: 0, t: 0 }))
    this.ringHead = 0
    this.ringCount = 0
    this._move = (ev) => this.onMove(ev)
    this._up = (ev) => this.onUp(ev)
    this._wheel = (ev) => this.onWheel(ev)
    this._down2 = (ev) => this.onSecondDown(ev)
    this._lost = (ev) => this.h && !this.h.keys && ev.pointerId === this.h.id && this.cancel()
    this._blur = () => this.h && !this.h.keys && this.cancel()
    this._hidden = () => document.hidden && this._blur()
  }

  bind({ body, mesh, rapier, camera, canvas }) {
    this.body = body
    this.mesh = mesh
    this.rapier = rapier
    this.camera = camera
    this.canvas = canvas
  }

  get holding() {
    return !!this.h
  }

  hover(on) {
    // only the intact bowl owns the cursor: once it breaks, the hidden bowl's
    // hover events must not reset what the mend is showing
    if (!this.canvas || this.h || rt.craft?.tool || store.get().phase !== 'intact') return
    this.canvas.style.cursor = on ? 'grab' : ''
  }

  sampleVelocity() {
    if (!this.body) return
    const v = this.body.linvel()
    this.preVel.set(v.x, v.y, v.z)
  }

  /** Record one pointer position (every coalesced event, not one per frame). */
  sample(x, y, t) {
    const s = this.ring[this.ringHead]
    s.x = x
    s.y = y
    s.t = t
    this.ringHead = (this.ringHead + 1) % RING
    this.ringCount = Math.min(RING, this.ringCount + 1)
  }

  listen(on) {
    const fn = on ? 'addEventListener' : 'removeEventListener'
    window[fn]('pointermove', this._move)
    window[fn]('pointerup', this._up)
    window[fn]('pointercancel', this._up)
    window[fn]('wheel', this._wheel, on ? { passive: false } : undefined)
    window[fn]('pointerdown', this._down2)
    // a hold must always end: focus leaving, the tab hiding, or the capture
    // being taken all set the bowl down gently instead of leaving it held
    window[fn]('blur', this._blur)
    document[fn]('visibilitychange', this._hidden)
    this.canvas[fn]('lostpointercapture', this._lost)
  }

  onPointerDown(e) {
    if (store.get().phase !== 'intact' || this.h || !this.mesh) return
    e.stopPropagation()
    e.nativeEvent.__kintsugiHit = true // the long-press loupe must leave this press alone
    audio.unlock()
    this.h = {
      mode: 'pending',
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      hitLocal: this.mesh.worldToLocal(e.point.clone()),
      hitWorld: e.point.clone(),
    }
    this.ringCount = 0
    this.sample(e.clientX, e.clientY, e.nativeEvent.timeStamp)
    // keep receiving this pointer outside the canvas and over the UI
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // not an active pointer (synthetic event): window listeners still work
    }
    // answer the press this frame, before tap-or-lift is decided: the bowl
    // gives under the finger (see squash) and the hand closes
    this.canvas.style.cursor = 'grabbing'
    this.listen(true)
  }

  /** A second finger while holding twists the bowl (angle between the two). */
  onSecondDown(ev) {
    const h = this.h
    if (!h || ev.pointerId === h.id || ev.pointerType !== 'touch') return
    h.second = { id: ev.pointerId, x: ev.clientX, y: ev.clientY }
    h.twistAngle = Math.atan2(ev.clientY - h.y, ev.clientX - h.x)
  }

  onMove(ev) {
    const h = this.h
    if (h?.second && ev.pointerId === h.second.id) {
      h.second.x = ev.clientX
      h.second.y = ev.clientY
      const a = Math.atan2(h.second.y - h.y, h.second.x - h.x)
      const d = Math.atan2(Math.sin(a - h.twistAngle), Math.cos(a - h.twistAngle))
      h.twistAngle = a
      if (h.mode === 'lift') h.yaw -= d
      return
    }
    if (!h || ev.pointerId !== h.id) return
    // the browser hands us one move per frame; the coalesced ones are the real path
    const co = ev.getCoalescedEvents?.()
    if (co?.length) for (let i = 0; i < co.length; i++) this.sample(co[i].clientX, co[i].clientY, co[i].timeStamp)
    else this.sample(ev.clientX, ev.clientY, ev.timeStamp)
    h.x = ev.clientX
    h.y = ev.clientY
    if (h.mode === 'pending' && Math.hypot(h.x - h.x0, h.y - h.y0) > TAP_SLOP_PX) this.startLift()
  }

  onWheel(ev) {
    if (this.h?.mode !== 'lift') return
    ev.preventDefault()
    this.h.yaw += ev.deltaY * 0.004
  }

  onUp(ev) {
    const h = this.h
    if (h?.second && ev.pointerId === h.second.id) {
      h.second = null
      return
    }
    if (!h || ev.pointerId !== h.id) return
    if (ev.type === 'pointercancel') {
      this.cancel()
      return
    }
    this.end()
    if (h.mode === 'pending') {
      const height01 = THREE.MathUtils.clamp(h.hitLocal.y / BOWL_HEIGHT, 0, 1)
      audio.ring({ height01, mended: false, position: h.hitWorld.toArray() })
      rt.lastRing = { height01, t: performance.now() }
      this.canvas.style.cursor = 'grab' // still over the bowl
    } else if (h.mode === 'lift') {
      this.release(ev)
    }
    this.h = null
  }

  /** The press ended without a pointerup: never ring, and set a held bowl down gently. */
  cancel() {
    const h = this.h
    if (!h) return
    this.end()
    if (h.mode === 'lift') this.release(null)
    else this.canvas.style.cursor = ''
    this.h = null
  }

  end() {
    const h = this.h
    this.listen(false)
    try {
      if (this.canvas.hasPointerCapture?.(h.id)) this.canvas.releasePointerCapture(h.id)
    } catch {
      // already released
    }
  }

  /** Keyboard: lift the bowl in place (Space / Enter). */
  keyLift() {
    if (store.get().phase !== 'intact' || this.h || !this.body) return false
    audio.unlock()
    const t = this.body.translation()
    this.h = { mode: 'pending', id: 'keys', keys: true, x: 0, y: 0, x0: 0, y0: 0, t0: performance.now() }
    this.startLift()
    // 4 cm: comfortably below the ~8.6 cm a hairline needs, so Space, Space sets it down
    this.h.keyTarget = new THREE.Vector3(t.x, t.y + 0.04, t.z)
    announce('Lifted 4 centimetres. W raises, S lowers; Space lets go.')
    return true
  }

  /** Keyboard: nudge the held bowl (metres). */
  keyMove(dx, dy, dz) {
    const h = this.h
    if (!h?.keys || h.mode !== 'lift') return
    h.keyTarget.x = THREE.MathUtils.clamp(h.keyTarget.x + dx, -TRAY_X, TRAY_X)
    h.keyTarget.y = THREE.MathUtils.clamp(h.keyTarget.y + dy, 0.001, MAX_LIFT)
    h.keyTarget.z = THREE.MathUtils.clamp(h.keyTarget.z + dz, -TRAY_Z, TRAY_Z)
    if (dy) announce(`${Math.round(h.keyTarget.y * 100)} centimetres up.`)
  }

  keyTwist(d) {
    if (this.h?.mode === 'lift') this.h.yaw += d
  }

  /** Keyboard: let go where it is (it falls — low is a set-down, high breaks). */
  keyRelease() {
    if (!this.h?.keys || this.h.mode !== 'lift') return false
    this.release(null)
    this.h = null
    return true
  }

  /** Keyboard: flick the rim (T) — rings it without lifting. */
  keyRing() {
    if (store.get().phase !== 'intact' || !this.body) return
    audio.unlock()
    const t = this.body.translation()
    audio.ring({ height01: 0.95, mended: false, position: [t.x, t.y + 0.08, t.z] })
  }

  startLift() {
    const h = this.h
    const b = this.body
    if (!h || !b || store.get().phase !== 'intact') return
    h.mode = 'lift'
    dispatch({ type: 'LIFT' })
    b.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    const t = b.translation()
    h.pos = new THREE.Vector3(t.x, t.y, t.z) // the hand's spring (may stray past the limits)
    h.vel = new THREE.Vector3()
    h.out = h.pos.clone() // where the bowl is drawn: the spring, rubber-banded
    h.gain = new THREE.Vector3(1, 1, 1) // how much of the hand's motion the band lets through
    h.q = new THREE.Quaternion()
    const r = b.rotation()
    h.yaw = _e.setFromQuaternion(_q.set(r.x, r.y, r.z, r.w), 'YXZ').y
    h.tilt = new THREE.Vector2()
    h.tiltV = new THREE.Vector2()
    h.rise = 0 // lift-off spring: 0 → LIFT_ON_GRAB for a hand
    h.riseV = 0
    h.cmT = 0
    h.plane = facingPlane(this.camera, h.pos)
    h.offset = new THREE.Vector3()
    if (!h.keys && pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, _a)) h.offset.subVectors(h.pos, _a)
    // the body's group can be drawn straight from the spring if nothing above it moves
    const g = this.mesh?.parent
    this.group = g?.parent && g.parent.matrixWorld.equals(_identity) ? g : null
    rt.held = h
    this.canvas.style.cursor = 'grabbing'
    // the soft knock of ceramic leaving wood
    audio.tok({ position: [t.x, t.y, t.z], strength: 0.1 })
  }

  /** Let go. `ev` is the pointerup (a throw is read from the trace); null sets it down gently. */
  release(ev) {
    const h = this.h
    const b = this.body
    if (!h || !b || !h.out) return
    const v = _v.set(0, 0, 0)
    if (h.keys) v.copy(h.vel)
    else if (ev) {
      const n = this.ringCount
      const trace = new Array(n)
      for (let i = 0; i < n; i++) trace[i] = this.ring[(this.ringHead - n + i + RING) % RING]
      // px/ms; exactly 0 if the pointer rested > 40 ms first — a set-down never throws
      const { vx, vy } = throwVelocity(trace, { x: ev.clientX, y: ev.clientY, t: ev.timeStamp })
      // onto the hold plane: where the pointer would be 10 ms on, in metres
      if (
        (vx || vy) &&
        pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, _a) &&
        pointOnPlane(h.x + vx * 10, h.y + vy * 10, this.camera, this.canvas, h.plane, _b)
      ) {
        v.subVectors(_b, _a).divideScalar(0.01)
      }
    }
    v.multiply(h.gain) // pressed into a limit, the bowl isn't moving the way the hand is
    if (v.length() > MAX_RELEASE) v.setLength(MAX_RELEASE)
    rt.releaseSpeed = v.length()
    // let go exactly where it was drawn (a tick may not have landed this frame)
    b.setTranslation(h.out, true)
    b.setRotation(h.q, true)
    b.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
    b.setLinvel(v, true)
    // a swung bowl tumbles a little around the axis it was swinging on
    b.setAngvel({ x: v.z * 2.2, y: 0, z: -v.x * 2.2 }, true)
    rt.held = null
    dispatch({ type: 'SET_DOWN' })
    store.set({ hint: null })
    this.canvas.style.cursor = ''
  }

  /** Press feedback: a critically damped squash toward 1 while pending, back to exactly 0 after. */
  squash(dt) {
    const goal = this.h?.mode === 'pending' ? 1 : 0
    if (goal === 0 && this.press === 0) return
    spring(this.press, this.pressV, goal, FEEL.press, 1, dt)
    this.press = sx
    this.pressV = sv
    // exactly back to scale 1: the crack and the gold seams are parented to this mesh
    if (goal === 0 && Math.abs(this.press) < 1e-4 && Math.abs(this.pressV) < 1e-2) this.press = this.pressV = 0
    const p = this.press
    this.mesh?.scale.set(1 + FEEL.spread * p, 1 - FEEL.squash * p, 1 + FEEL.spread * p)
  }

  frame(delta) {
    const b = this.body
    if (!b) return
    const dt = Math.min(delta, 0.05)
    this.squash(dt)
    const h = this.h
    if (!h) {
      this.recover()
      return
    }
    // press-and-hold without moving also picks it up
    if (h.mode === 'pending' && performance.now() - h.t0 > TAP_MAX_MS) this.startLift()
    if (h.mode !== 'lift') return
    const goal = _goal
    if (h.keys) goal.copy(h.keyTarget)
    else if (pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, goal)) goal.add(h.offset)
    else goal.copy(h.pos) // a ray parallel to the plane: stay put

    // the hand: one critically damped spring per axis, carrying its velocity
    spring(h.pos.x, h.vel.x, goal.x, FEEL.follow, 1, dt)
    h.pos.x = sx
    h.vel.x = sv
    spring(h.pos.y, h.vel.y, goal.y, FEEL.follow, 1, dt)
    h.pos.y = sx
    h.vel.y = sv
    spring(h.pos.z, h.vel.z, goal.z, FEEL.follow, 1, dt)
    h.pos.z = sx
    h.vel.z = sv
    // lift-off: rises through its own spring instead of jumping 28 mm
    spring(h.rise, h.riseV, h.keys ? 0 : LIFT_ON_GRAB, FEEL.rise, rt.reduced ? 1 : FEEL.riseZeta, dt)
    h.rise = sx
    h.riseV = sv

    // it lags and leans into the motion it shows (the band's slope from last
    // frame), swaying past level when it stops; no lean at all near the tray
    const vx = h.vel.x * h.gain.x
    const vy = h.vel.y * h.gain.y
    const vz = h.vel.z * h.gain.z
    const tx = MAX_TILT * Math.tanh((vz * FEEL.leanX - vy * FEEL.leanY) / MAX_TILT)
    const tz = MAX_TILT * Math.tanh((-vx * FEEL.leanZ) / MAX_TILT)
    const zeta = rt.reduced ? 1 : FEEL.leanZeta
    spring(h.tilt.x, h.tiltV.x, tx, FEEL.lean, zeta, dt)
    h.tilt.x = sx
    h.tiltV.x = sv
    spring(h.tilt.y, h.tiltV.y, tz, FEEL.lean, zeta, dt)
    h.tilt.y = sx
    h.tiltV.y = sv
    const raw = h.pos.y + h.rise
    const low = smooth01(raw / 0.04)
    const lx = h.tilt.x * low
    const lz = h.tilt.y * low
    const sinT = Math.sin(Math.min(1.2, Math.hypot(lx, lz)))

    // limits, softly: never into the tray (a tipped foot dips), never into
    // its rim, never out of reach — the kinematic bowl ignores the tray, so
    // anything it entered would pop out on release as a false impact
    const out = h.out
    out.y = soft(raw, FOOT_R * sinT + CLEAR, MAX_LIFT, FEEL.give.floor, FEEL.give.top)
    h.gain.y = band
    const xMax = Math.min(TRAY_X, reach(WALL_X, out.y, sinT))
    out.x = soft(h.pos.x, -xMax, xMax, FEEL.give.side, FEEL.give.side)
    h.gain.x = band
    const zMax = Math.min(TRAY_Z, reach(WALL_Z, out.y, sinT))
    out.z = soft(h.pos.z, -zMax, zMax, FEEL.give.side, FEEL.give.side)
    h.gain.z = band

    _e.set(lx, h.yaw, lz, 'YXZ')
    h.q.setFromEuler(_e)
    b.setNextKinematicTranslation(out)
    b.setNextKinematicRotation(h.q)
    // draw it there now: a 1/120 s tick doesn't land on every frame (144 Hz)
    // and kinematic bodies aren't interpolated, so the physics copy would stall
    if (this.group) {
      this.group.position.copy(out)
      this.group.quaternion.copy(h.q)
    }
    h.height = out.y
    // how high it is, in whole centimetres — severity is learnable, not metered
    // (at most every 100 ms: each change re-renders the overlay)
    const cm = Math.round(out.y * 100)
    const now = performance.now()
    if (cm !== h.cm && now - h.cmT >= 100) {
      h.cm = cm
      h.cmT = now
      store.set({ hint: cm >= 2 ? `${cm} cm` : null })
    }
  }

  /** A throw that misses the tray would fall forever: bring it back to its slot. */
  recover() {
    const phase = store.get().phase
    if (phase !== 'intact' || !this.body.isEnabled()) return
    const t = this.body.translation()
    if (t.y > -0.03 && Math.abs(t.x) < 0.2 && Math.abs(t.z) < 0.14) return
    this.body.setTranslation({ x: BOWL_SLOT[0], y: 0.04, z: BOWL_SLOT[2] }, true)
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    announce('The bowl missed the tray and is back in its place.')
  }

  onCollision(other) {
    const phase = store.get().phase
    if (phase !== 'intact' && phase !== 'held') return
    if (other.rigidBodyObject?.name !== 'tray') return
    const v = this.preVel
    const impactSpeed = Math.max(-v.y, v.length() * 0.8)
    if (impactSpeed < 0.25) return
    const b = this.body
    const severity = classifyImpact({ impactSpeed, releaseSpeed: rt.releaseSpeed ?? 0 })
    rt.releaseSpeed = 0
    const t = b.translation()
    const r = b.rotation()
    _q.set(r.x, r.y, r.z, r.w)
    // the lowest probe is where it hit
    let best = PROBES[0]
    let bestY = Infinity
    for (const p of PROBES) {
      const y = _v.copy(p).applyQuaternion(_q).y
      if (y < bestY) {
        bestY = y
        best = p
      }
    }
    const pos = new THREE.Vector3(t.x, t.y, t.z)
    const info = {
      severity,
      impactSpeed,
      impactLocal: best.clone(),
      impactWorld: best.clone().applyQuaternion(_q).add(pos),
      position: pos,
      quaternion: _q.clone(),
      velocity: v.clone(),
    }
    rt.lastImpact = info
    if (severity === SEVERITY.SET) {
      audio.tok({ position: info.impactWorld.toArray(), strength: Math.min(1, impactSpeed / 1.3) })
      if (impactSpeed > 0.6) announce('Set down, unbroken.')
      return
    }
    rt.onBreak?.(info)
  }
}
