// Imperative controller for holding the intact bowl: tap-to-ring vs lift,
// the spring the bowl follows, its lean into motion, twist on the wheel,
// release velocity, and first-contact impact classification. Kept outside
// React so per-frame mutation stays out of the render model.

import * as THREE from 'three'
import { audio } from '../audio/engine.js'
import { classifyImpact, SEVERITY } from '../logic/severity.js'
import { TAP_MAX_MS, TAP_SLOP_PX } from '../logic/gestures.js'
import { dispatch, rt, store } from '../state/store.js'
import { facingPlane, pointOnPlane } from '../input/pointer.js'

export const BOWL_HEIGHT = 0.086
const TRAY_X = 0.165
const TRAY_Z = 0.1
const MAX_LIFT = 0.34
const LIFT_ON_GRAB = 0.028 // it rises a little the moment you take it
const MAX_TILT = THREE.MathUtils.degToRad(18)
const MAX_RELEASE = 6.5 // m/s

// Rim + wall + foot sample points (bowl-local) for finding the first contact.
const PROBES = []
for (let i = 0; i < 24; i++) {
  const a = (i / 24) * Math.PI * 2
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.06, 0.085, Math.cos(a) * 0.06))
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.058, 0.045, Math.cos(a) * 0.058))
  PROBES.push(new THREE.Vector3(Math.sin(a) * 0.026, 0.0, Math.cos(a) * 0.026))
}

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()

export class BowlHold {
  constructor() {
    this.h = null
    this.preVel = new THREE.Vector3()
    this.body = null
    this.mesh = null
    this.rapier = null
    this.camera = null
    this.canvas = null
    this._move = (ev) => this.onMove(ev)
    this._up = (ev) => this.onUp(ev)
    this._wheel = (ev) => this.onWheel(ev)
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
    if (!this.canvas || this.h) return
    this.canvas.style.cursor = on && store.get().phase === 'intact' ? 'grab' : ''
  }

  sampleVelocity() {
    if (!this.body) return
    const v = this.body.linvel()
    this.preVel.set(v.x, v.y, v.z)
  }

  onPointerDown(e) {
    if (store.get().phase !== 'intact' || this.h || !this.mesh) return
    e.stopPropagation()
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
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
    window.addEventListener('wheel', this._wheel, { passive: false })
  }

  onMove(ev) {
    const h = this.h
    if (!h || ev.pointerId !== h.id) return
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
    if (!h || ev.pointerId !== h.id) return
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
    window.removeEventListener('wheel', this._wheel)
    if (h.mode === 'pending') {
      const height01 = THREE.MathUtils.clamp(h.hitLocal.y / BOWL_HEIGHT, 0, 1)
      audio.ring({ height01, mended: false, position: h.hitWorld.toArray() })
      rt.lastRing = { height01, t: performance.now() }
    } else if (h.mode === 'lift') {
      this.release()
    }
    this.h = null
  }

  startLift() {
    const h = this.h
    const b = this.body
    if (!h || !b || store.get().phase !== 'intact') return
    h.mode = 'lift'
    dispatch({ type: 'LIFT' })
    b.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    const t = b.translation()
    h.pos = new THREE.Vector3(t.x, t.y, t.z)
    h.prev = h.pos.clone()
    h.vel = new THREE.Vector3()
    const r = b.rotation()
    h.yaw = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w), 'YXZ').y
    h.tilt = new THREE.Vector2()
    h.plane = facingPlane(this.camera, h.pos)
    const p0 = new THREE.Vector3()
    pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, p0)
    h.offset = h.pos.clone().sub(p0)
    h.offset.y += LIFT_ON_GRAB
    h.history = []
    rt.held = h
    this.canvas.style.cursor = 'grabbing'
  }

  release() {
    const h = this.h
    const b = this.body
    if (!h || !b) return
    const now = performance.now()
    const hist = h.history.filter((s) => now - s.t <= 90)
    const v = new THREE.Vector3()
    if (hist.length >= 2) {
      const a = hist[0]
      const z = hist[hist.length - 1]
      const dt = Math.max(0.008, (z.t - a.t) / 1000)
      v.subVectors(z.p, a.p).divideScalar(dt)
    }
    if (v.length() > MAX_RELEASE) v.setLength(MAX_RELEASE)
    rt.releaseSpeed = v.length()
    b.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
    b.setLinvel(v, true)
    // a swung bowl tumbles a little around the axis it was swinging on
    b.setAngvel({ x: v.z * 2.2, y: 0, z: -v.x * 2.2 }, true)
    rt.held = null
    dispatch({ type: 'SET_DOWN' })
    this.canvas.style.cursor = ''
  }

  frame(dt) {
    const h = this.h
    const b = this.body
    if (!h || !b) return
    // press-and-hold without moving also picks it up
    if (h.mode === 'pending' && performance.now() - h.t0 > TAP_MAX_MS) this.startLift()
    if (h.mode !== 'lift') return
    const target = _v
    if (!pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, target)) return
    target.add(h.offset)
    target.x = THREE.MathUtils.clamp(target.x, -TRAY_X, TRAY_X)
    target.z = THREE.MathUtils.clamp(target.z, -TRAY_Z, TRAY_Z)
    target.y = THREE.MathUtils.clamp(target.y, 0.001, MAX_LIFT)
    const k = 1 - Math.exp(-dt / 0.055) // soft spring toward the finger
    h.prev.copy(h.pos)
    h.pos.lerp(target, k)
    h.vel.subVectors(h.pos, h.prev).divideScalar(Math.max(dt, 1e-3))
    // it lags and leans into the motion
    const tx = THREE.MathUtils.clamp(h.vel.z * 0.35 - h.vel.y * 0.05, -MAX_TILT, MAX_TILT)
    const tz = THREE.MathUtils.clamp(-h.vel.x * 0.4, -MAX_TILT, MAX_TILT)
    const kt = 1 - Math.exp(-dt / 0.09)
    h.tilt.x += (tx - h.tilt.x) * kt
    h.tilt.y += (tz - h.tilt.y) * kt
    _e.set(h.tilt.x, h.yaw, h.tilt.y, 'YXZ')
    _q.setFromEuler(_e)
    b.setNextKinematicTranslation(h.pos)
    b.setNextKinematicRotation(_q)
    h.history.push({ t: performance.now(), p: h.pos.clone() })
    if (h.history.length > 24) h.history.shift()
    h.height = h.pos.y
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
      return
    }
    rt.onBreak?.(info)
  }
}
