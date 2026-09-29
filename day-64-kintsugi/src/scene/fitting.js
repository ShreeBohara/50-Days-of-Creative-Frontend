// The mend: rebuilding the bowl outward from its foot. An imperative
// controller (like bowlHold) so per-frame physics poses stay out of React.
//
//  - The anchor (foot-ring shard) rights itself and settles into the tray's
//    bowl slot. That pose defines the assembly frame A; every placed shard is a
//    kinematic body pinned at A × home (home = its Blender centre of mass,
//    identity rotation).
//  - Dragging a loose shard: it lifts onto a camera-facing plane through the
//    assembly and turns to its home orientation, so only POSITION is left to
//    solve. The assembly turns so the shard's home faces you.
//  - The magnet works in screen space (the pointer can't express depth): the
//    distance between where the shard is drawn and where its home is drawn,
//    converted to metres at the home's depth. Inside the magnet radius the
//    shard is pulled along the view ray toward home; inside the tolerance it
//    locks — but only if it borders a placed piece (you mend from the foot out).

import * as THREE from 'three'
import { audio } from '../audio/engine.js'
import { buildAdjacency, lockReason, magnetPull, MAGNET_RADIUS, nextAutoFit, SNAP_TOL } from '../logic/fitRules.js'
import { TAP_SLOP_PX } from '../logic/gestures.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { BOWL_SLOT } from './geometry.js'
import { facingPlane, pointOnPlane, toClient } from '../input/pointer.js'

const ANCHOR_RISE = 1.3 // s
const SNAP_TIME = 0.12
const FLIGHT_TIME = 0.75
const HINT_AFTER = 20 // s idle before the ghost appears
const HELP_AFTER = 180 // s before "mend the rest" is offered
const LIFT = 0.018

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _xAxis = new THREE.Vector3(1, 0, 0)
const _c1 = { x: 0, y: 0 }
const _c2 = { x: 0, y: 0 }

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a))

export class Fitting {
  constructor() {
    this.assembly = new THREE.Group()
    this.assembly.name = 'assembly'
    this.assembly.position.set(BOWL_SLOT[0], 0.0015, BOWL_SLOT[2])
    this.yaw = 0
    this.yawTarget = 0
    this.placed = new Set()
    this.order = [] // ids in the order they were fitted (the share code keeps it)
    this.flip = 0 // 0 upright … 1 turned over to show the foot
    this.flipTarget = 0
    this.anims = new Map() // id -> { kind, t, dur, fromPos, fromQuat }
    this.hold = null
    this.spin = null
    this.active = false // the fitting interaction itself
    this.riding = false // placed pieces (or the intact bowl) pinned to the assembly
    this.intact = null // hairline: the whole bowl rides the assembly
    this.ghostId = null
    this.idle = 0
    this.elapsed = 0
    this._move = (e) => this.onMove(e)
    this._up = (e) => this.onUp(e)
  }

  bind({ rapier, camera, canvas }) {
    this.rapier = rapier
    this.camera = camera
    this.canvas = canvas
  }

  get variant() {
    return rt.variant
  }

  shard(id) {
    return this.variant?.shards[id]
  }

  body(id) {
    return rt.shardBodies?.get(id)
  }

  homeWorld(id, out = new THREE.Vector3()) {
    return this.assembly.localToWorld(out.copy(this.shard(id).com))
  }

  // ------------------------------------------------------------ lifecycle

  begin() {
    const v = this.variant
    if (!v || this.active) return
    this.active = true
    this.riding = true
    this.adjacency = buildAdjacency(v.json)
    this.anchorId = v.json.anchor
    this.placed.clear()
    this.order = []
    this.anims.clear()
    this.elapsed = 0
    this.idle = 0
    this.ghostId = null
    this.autoAll = false
    this.catchStrays() // anything flung past the walls comes back before we start
    const body = this.body(this.anchorId)
    if (!body) return
    const t = body.translation()
    this.yaw = this.yawTarget = 0
    this.assembly.quaternion.identity()
    this.assembly.updateMatrixWorld(true)
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.anims.set(this.anchorId, {
      kind: 'rise',
      t: 0,
      dur: ANCHOR_RISE,
      fromPos: new THREE.Vector3(t.x, t.y, t.z),
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
    })
  }

  end() {
    this.active = false
    this.hold = null
    this.spin = null
    this.ghostId = null
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
  }

  /** Hairline: the unbroken bowl rights itself into the slot and rides A. */
  rideIntact(body) {
    this.intact = body
    this.riding = true
    this.yaw = this.yawTarget = 0
    const t = body.translation()
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.anims.set('intact', {
      kind: 'rise',
      t: 0,
      dur: ANCHOR_RISE * 0.8,
      fromPos: new THREE.Vector3(t.x, t.y, t.z),
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
      body,
    })
  }

  reset() {
    this.end()
    this.riding = false
    this.intact = null
    this.placed.clear()
    this.order = []
    this.anims.clear()
    this.yaw = this.yawTarget = 0
    this.flip = this.flipTarget = 0
  }

  // --------------------------------------------------------------- input

  hover(id, on) {
    if (!this.canvas || this.hold || rt.craft?.tool) return
    const can = on && this.active && store.get().phase === 'fitting' && !this.placed.has(id)
    this.canvas.style.cursor = can ? 'grab' : ''
  }

  onShardDown(e, id) {
    if (!this.active || store.get().phase !== 'fitting') return
    if (this.placed.has(id) || this.anims.has(id) || this.hold) return
    e.stopPropagation()
    audio.unlock()
    const body = this.body(id)
    if (!body) return
    const t = body.translation()
    const pos = new THREE.Vector3(t.x, t.y, t.z)
    const plane = facingPlane(this.camera, _a.copy(this.assembly.position).setY(0.045))
    const p0 = new THREE.Vector3()
    pointOnPlane(e.clientX, e.clientY, this.camera, this.canvas, plane, p0)
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.hold = {
      id,
      pid: e.pointerId,
      touch: e.pointerType === 'touch',
      x: e.clientX,
      y: e.clientY,
      plane,
      offset: new THREE.Vector3(0, LIFT, 0),
      pos,
      quat: new THREE.Quaternion().copy(body.rotation()),
      history: [],
      grabbedFrom: pos.clone(),
      pull: 0,
    }
    // bring this piece's home round to face the viewer
    const com = this.shard(id).com
    const az = Math.atan2(com.x, com.z)
    this.yawTarget = this.yaw + wrapPi(-az - this.yaw)
    this.idle = 0
    this.ghostId = null
    this.canvas.style.cursor = 'grabbing'
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
  }

  /** Turn the mended bowl over to show its foot and kiln seal (and back). */
  toggleFlip() {
    if (!this.riding) return
    this.flipTarget = this.flipTarget > 0.5 ? 0 : 1
  }

  /** Drag on empty space turns the assembly (while mending, and once kept). */
  onEmptyDown(e) {
    const phase = store.get().phase
    const craft = phase === 'lacquer' || phase === 'gild' || phase === 'burnish'
    // (with a tool in hand the craft controller owns presses instead)
    const can =
      (this.active && phase === 'fitting') || (this.riding && (phase === 'keep' || (craft && !rt.craft?.tool)))
    if (!can || this.hold) return
    this.spin = { pid: e.pointerId, x: e.clientX, yaw0: this.yawTarget }
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
  }

  onMove(e) {
    if (this.hold && e.pointerId === this.hold.pid) {
      this.hold.x = e.clientX
      this.hold.y = e.clientY
    } else if (this.spin && e.pointerId === this.spin.pid) {
      if (Math.abs(e.clientX - this.spin.x) > TAP_SLOP_PX) this.spin.moved = true
      this.yawTarget = this.spin.yaw0 + (e.clientX - this.spin.x) * 0.012
    }
  }

  onUp(e) {
    if (this.spin && e.pointerId === this.spin.pid) {
      this.spin = null
    }
    const h = this.hold
    if (h && e.pointerId === h.pid) {
      this.hold = null
      this.canvas.style.cursor = ''
      if (!this.anims.has(h.id) && !this.placed.has(h.id)) this.drop(h)
    }
    if (!this.hold && !this.spin) {
      window.removeEventListener('pointermove', this._move)
      window.removeEventListener('pointerup', this._up)
      window.removeEventListener('pointercancel', this._up)
    }
  }

  drop(h) {
    const body = this.body(h.id)
    if (!body) return
    const now = performance.now()
    const hist = h.history.filter((s) => now - s.t <= 90)
    const v = new THREE.Vector3()
    if (hist.length >= 2) {
      const a = hist[0]
      const z = hist[hist.length - 1]
      v.subVectors(z.p, a.p).divideScalar(Math.max(0.008, (z.t - a.t) / 1000))
    }
    v.clampLength(0, 2.5)
    body.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
    body.setLinvel(v, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    if (h.near && h.reason === 'no-neighbour') {
      audio.reject({ position: h.pos.toArray() })
      store.set({ hint: 'mend outward from the foot' })
      setTimeout(() => store.get().hint === 'mend outward from the foot' && store.set({ hint: null }), 2600)
    }
  }

  // --------------------------------------------------------------- snaps

  lock(id) {
    const body = this.body(id)
    if (!body) return
    const t = body.translation()
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.anims.set(id, {
      kind: 'snap',
      t: 0,
      dur: SNAP_TIME,
      fromPos: new THREE.Vector3(t.x, t.y, t.z),
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
    })
  }

  placedDone(id) {
    this.placed.add(id)
    this.order.push(id)
    this.idle = 0
    this.ghostId = null
    const n = this.placed.size
    const total = this.variant.shards.length
    store.set({ placed: n })
    if (id !== this.anchorId) {
      audio.snap({ position: this.homeWorld(id).toArray() })
      try {
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8)
      } catch {
        // no haptics here
      }
      announce(`Piece ${n} of ${total} placed.`)
    }
    if (n === total) {
      this.ghostId = null
      this.autoAll = false
      store.set({ hint: null })
      setTimeout(() => {
        if (store.get().phase === 'fitting') {
          this.end()
          store.set({ hint: null })
          dispatch({ type: 'ALL_PLACED' })
          announce('Every piece is home. Lacquer the seams.')
        }
      }, 650)
    }
  }

  /** "Mend the rest": keep flying pieces home until the bowl is whole. */
  mendTheRest() {
    this.autoAll = true
    this.autoFitNext()
  }

  /** Fly the next piece home (M). */
  autoFitNext() {
    if (!this.active || this.hold) return false
    const id = nextAutoFit(this.placed, this.adjacency, this.anchorId)
    if (id == null || this.placed.has(id) || this.anims.has(id)) return false
    const body = this.body(id)
    if (!body) return false
    const t = body.translation()
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    const com = this.shard(id).com
    this.yawTarget = this.yaw + wrapPi(-Math.atan2(com.x, com.z) - this.yaw)
    this.anims.set(id, {
      kind: 'flight',
      t: 0,
      dur: FLIGHT_TIME,
      fromPos: new THREE.Vector3(t.x, t.y, t.z),
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
    })
    return true
  }

  // ---------------------------------------------------------------- frame

  frame(dt) {
    if (!this.riding) return
    this.elapsed += dt
    if (!this.hold) this.idle += dt

    // assembly turns toward its target yaw (critically damped); a flip lifts
    // it off the tray and turns it foot-up toward the viewer
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-dt / 0.28))
    this.flip += (this.flipTarget - this.flip) * (1 - Math.exp(-dt / 0.35))
    const f = this.flip
    _q.setFromAxisAngle(_xAxis, -Math.PI * 0.82 * f)
    this.assembly.quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw).premultiply(_q)
    this.assembly.position.set(BOWL_SLOT[0], 0.0015 + f * 0.095 + Math.sin(Math.PI * f) * 0.02, BOWL_SLOT[2] + f * 0.02)
    this.assembly.updateMatrixWorld(true)

    // placed pieces ride the assembly
    for (const id of this.placed) {
      const body = this.body(id)
      if (!body) continue
      body.setNextKinematicTranslation(this.homeWorld(id, _a))
      body.setNextKinematicRotation(this.assembly.quaternion)
    }
    if (this.intact && !this.anims.has('intact')) {
      this.intact.setNextKinematicTranslation(this.assembly.position)
      this.intact.setNextKinematicRotation(this.assembly.quaternion)
    }

    // anchor rise, snaps, auto-fit flights
    for (const [id, an] of this.anims) {
      const body = an.body ?? this.body(id)
      if (!body) {
        this.anims.delete(id)
        continue
      }
      an.t += dt
      const k = Math.min(1, an.t / an.dur)
      const e = ease(k)
      const home = an.body ? _a.copy(this.assembly.position) : this.homeWorld(id, _a)
      _b.lerpVectors(an.fromPos, home, e)
      if (an.kind !== 'snap') _b.y += Math.sin(Math.PI * k) * (an.kind === 'rise' ? 0.05 : 0.06)
      _q.slerpQuaternions(an.fromQuat, this.assembly.quaternion, an.kind === 'snap' ? e : Math.min(1, e * 1.4))
      body.setNextKinematicTranslation(_b)
      body.setNextKinematicRotation(_q)
      if (k >= 1) {
        this.anims.delete(id)
        if (!an.body) this.placedDone(id)
        if (this.autoAll && this.active && this.anims.size === 0) this.autoFitNext()
      }
    }

    if (!this.active) return
    if (this.hold) this.frameHold(dt)
    this.catchStrays()

    // hints
    const phase = store.get().phase
    if (phase === 'fitting' && this.placed.size > 0 && this.idle > HINT_AFTER && !this.hold) {
      this.ghostId = nextAutoFit(this.placed, this.adjacency, this.anchorId)
    }
    const remaining = this.placed.size < (this.variant?.shards.length ?? 0)
    if (phase === 'fitting' && remaining && !this.autoAll && this.elapsed > HELP_AFTER && !store.get().hint) {
      store.set({ hint: 'tap the word to mend the rest' })
    }
  }

  frameHold(dt) {
    const h = this.hold
    const body = this.body(h.id)
    if (!body) return
    const target = _a
    if (!pointOnPlane(h.x, h.y, this.camera, this.canvas, h.plane, target)) return
    target.add(h.offset)
    target.y = Math.max(0.004, target.y)

    // magnet: screen-space distance to home, expressed in metres at home depth
    const home = this.homeWorld(h.id, _b)
    toClient(target, this.camera, this.canvas, _c1)
    toClient(home, this.camera, this.canvas, _c2)
    const px = Math.hypot(_c1.x - _c2.x, _c1.y - _c2.y)
    const depth = this.camera.position.distanceTo(home)
    const rect = this.canvas.getBoundingClientRect()
    // from the live projection, so the 6× loupe's view offset is accounted for
    const pxPerM = ((rect.height / 2) * this.camera.projectionMatrix.elements[5]) / depth
    const dist = px / pxPerM
    const tol = h.touch ? SNAP_TOL.touch : SNAP_TOL.mouse
    const radius = h.touch ? MAGNET_RADIUS.touch : MAGNET_RADIUS.mouse
    const reason = lockReason({ id: h.id, placed: this.placed, adjacency: this.adjacency, dist, tol })
    h.reason = reason
    h.near = dist < radius
    const allowed = reason === 'ok' || reason === 'too-far'
    const neighbourOk = lockReason({ id: h.id, placed: this.placed, adjacency: this.adjacency, dist: 0, tol: 1 }) === 'ok'
    h.pull = allowed && neighbourOk ? magnetPull(dist, tol, radius) : 0
    target.lerp(home, h.pull * 0.85)

    const k = 1 - Math.exp(-dt / 0.05)
    h.pos.lerp(target, k)
    h.quat.slerp(this.assembly.quaternion, 1 - Math.exp(-dt / 0.12))
    body.setNextKinematicTranslation(h.pos)
    body.setNextKinematicRotation(h.quat)
    h.history.push({ t: performance.now(), p: h.pos.clone() })
    if (h.history.length > 20) h.history.shift()

    if (reason === 'ok') {
      this.hold = null
      this.canvas.style.cursor = ''
      this.lock(h.id)
    }
  }

  /** Anything that escapes the tray comes back to its edge. */
  catchStrays() {
    const bodies = rt.shardBodies
    if (!bodies) return
    bodies.forEach((body, id) => {
      if (this.placed.has(id) || this.anims.has(id) || this.hold?.id === id) return
      const t = body.translation()
      // the tray's inner walls — past them is the invisible slab margin
      if (t.y < -0.04 || Math.abs(t.x) > 0.195 || Math.abs(t.z) > 0.135) {
        body.setTranslation({ x: THREE.MathUtils.clamp(t.x, -0.15, 0.15), y: 0.03, z: THREE.MathUtils.clamp(t.z, -0.09, 0.09) }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    })
  }
}
