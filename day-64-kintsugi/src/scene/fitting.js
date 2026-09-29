// The mend: rebuilding the bowl outward from its foot. An imperative
// controller (like bowlHold) so per-frame physics poses stay out of React.
//
//  - The anchor (foot-ring shard) rights itself and settles into the tray's
//    bowl slot. That pose defines the assembly frame A; every placed shard is a
//    kinematic body pinned at A × home (home = its Blender centre of mass,
//    identity rotation).
//  - Dragging a loose shard: it moves on a camera-facing plane through ITSELF,
//    keeping the grab offset (as three.js DragControls does), so the press
//    moves nothing; it lifts a few mm and turns to its home orientation, so
//    only POSITION is left to solve. As it nears home the offset fades and its
//    depth blends to the home's, so it arrives centred under the pointer.
//  - The magnet works in screen space (the pointer can't express depth): the
//    distance between where the shard is drawn and where its home is drawn,
//    converted to metres at the home's depth. Inside the magnet radius (with
//    hysteresis) the shard is pulled toward home; inside the tolerance it sits
//    fully home as a preview. Nothing locks mid-drag: letting go inside the
//    magnet seats it — if it borders a placed piece (you mend from the foot
//    out). One that can't attach yet shakes its head and flies back.

import * as THREE from 'three'
import { audio } from '../audio/engine.js'
import {
  approachProgress,
  buildAdjacency,
  lockReason,
  magnetAssist,
  magnetHeld,
  magnetRadius,
  nextAutoFit,
  snapTolerance,
} from '../logic/fitRules.js'
import { TAP_SLOP_PX } from '../logic/gestures.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { BOWL_SLOT } from './geometry.js'
import { canvasRect, rayFromClient, toClient } from '../input/pointer.js'

const ANCHOR_RISE = 1.3 // s
const SNAP_MIN = 0.06 // s: a seat from release — quick when it's already home…
const SNAP_PER_M = 5 // …plus 5 ms per mm still to travel
const SNAP_MAX = 0.22
const FLIGHT_TIME = 0.75
const SEAT_HOLD = 0.065 // s: pressed home and resting before it counts as placed
const PRESS = 0.001 // m: the press-in toward its placed neighbours at the seat
const WIGGLE_TIME = 0.25 // s: a rejected piece shakes its head…
const WIGGLE_ANGLE = THREE.MathUtils.degToRad(4)
const RETURN_TIME = 0.35 // s: …then flies back to where it was taken from
const RETURN_ARC = 0.015
const STRAY_TIME = 0.45
const STRAY_ARC = 0.05
const HINT_AFTER = 20 // s idle before the ghost appears
const HELP_AFTER = 180 // s before "mend the rest" is offered
const REJECT_HINT = 'mend outward from the foot'
const LIFT = 0.005 // m: the hover a piece takes when picked up…
const LIFT_TAU = 0.025 // s: …critically damped, ~90 % there by 100 ms
const FLOOR = 0.004 // m: lowest a held piece's centre goes (unless it lay lower)
const APPROACH_PX = 250 // screen distance at which the approach blend begins
const FOLLOW_TAU = 0.04 // s: the held piece trails its target by this much
const TURN_TAU = 0.12
const PULL_TAU = 0.05 // s: smooths the magnet's catch and release
const MAX_DROP_SPEED = 0.6 // m/s: a tray is 0.4 m wide — no hurling pieces across it
const VEL_WINDOW = 90 // ms of samples in the release-velocity fit
const VEL_STALE = 40 // ms: newest sample older than this at release → it was at rest
const RING = 24
// the tray's walls are at |x| 0.198–0.21, |z| 0.138–0.15: only a piece
// clearly past them (or sunk into the slab) is a stray
const STRAY_X = 0.215
const STRAY_Z = 0.155
const STRAY_Y = -0.02

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _d = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _hit = new THREE.Vector3()
const _v0 = new THREE.Vector3()
const _v1 = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _xAxis = new THREE.Vector3(1, 0, 0)
const _yAxis = new THREE.Vector3(0, 1, 0)
const _ray = new THREE.Ray()
const _plane = new THREE.Plane()
const _floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _c1 = { x: 0, y: 0 }
const _c2 = { x: 0, y: 0 }
const _why = { id: 0, placed: null, adjacency: null, dist: 0, tol: 0 } // lockReason args, reused

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a))

export class Fitting {
  constructor() {
    this.assembly = new THREE.Group()
    this.assembly.name = 'assembly'
    this.assembly.position.set(BOWL_SLOT[0], 0.0015, BOWL_SLOT[2])
    this.yaw = 0
    this._yawTarget = 0
    this.placed = new Set()
    this.order = [] // ids in the order they were fitted (the share code keeps it)
    this.flip = 0 // 0 upright … 1 turned over to show the foot
    this.flipTarget = 0
    // id -> { kind: rise|snap|flight|wiggle|return, t, dur, fromPos, fromQuat, … }
    this.anims = new Map()
    this.hold = null
    this.spin = null
    this.active = false // the fitting interaction itself
    this.riding = false // placed pieces (or the intact bowl) pinned to the assembly
    this.intact = null // hairline: the whole bowl rides the assembly
    this.ghostId = null
    this.idle = 0
    this.elapsed = 0
    this.chain = false // an animation finished: "mend the rest" may fly the next piece
    // recent held positions for the release velocity (no per-frame garbage)
    this.ring = { p: Array.from({ length: RING }, () => new THREE.Vector3()), t: new Float64Array(RING), head: 0, n: 0 }
    this._move = (e) => this.onMove(e)
    this._up = (e) => this.onUp(e)
    this._cancel = () => this.cancel()
    this._hidden = () => document.visibilityState === 'hidden' && this.cancel()
    this._stray = (body, id) => this.stray(body, id, false)
    this._strayAll = (body, id) => this.stray(body, id, true)
  }

  bind({ rapier, camera, canvas }) {
    this.rapier = rapier
    this.camera = camera
    this.canvas = canvas
  }

  get variant() {
    return rt.variant
  }

  // Every writer (spin, Q/E, craft, the grab turn) goes through here. While a
  // held piece is inside the magnet its target must not move under it.
  get yawTarget() {
    return this._yawTarget
  }

  set yawTarget(v) {
    if (!this.hold?.near) this._yawTarget = v
  }

  /** A piece is in hand: the camera rig should hold still. */
  get aiming() {
    return this.hold != null
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

  /** Does this piece share a crack with one already placed? */
  borders(id) {
    _why.id = id
    _why.placed = this.placed
    _why.adjacency = this.adjacency
    _why.dist = 0
    _why.tol = 1
    return lockReason(_why) === 'ok'
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
    // anything flung past the walls comes back before we start (asleep or not)
    rt.shardBodies?.forEach(this._strayAll)
    const body = this.body(this.anchorId)
    if (!body) return
    const t = body.translation()
    this.yaw = this._yawTarget = 0
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
    if (this.hold) this.uncapture(this.hold)
    this.hold = null
    this.spin = null
    this.ghostId = null
    this.listen(false)
  }

  /** Hairline: the unbroken bowl rights itself into the slot and rides A. */
  rideIntact(body) {
    this.intact = body
    this.riding = true
    this.yaw = this._yawTarget = 0
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
    this.yaw = this._yawTarget = 0
    this.flip = this.flipTarget = 0
  }

  // --------------------------------------------------------------- input

  hover(id, on) {
    if (!this.canvas || this.hold || rt.craft?.tool) return
    const phase = store.get().phase
    const can = on && ((this.active && phase === 'fitting') || phase === 'broken') && !this.placed.has(id)
    this.canvas.style.cursor = can ? 'grab' : ''
  }

  /** Window/canvas listeners for a drag or spin in progress (idempotent). */
  listen(on) {
    const f = on ? 'addEventListener' : 'removeEventListener'
    window[f]('pointermove', this._move)
    window[f]('pointerup', this._up)
    window[f]('pointercancel', this._up)
    // the pointer can vanish without a pointerup: alt-tab, a system gesture,
    // a hidden tab — all of them let go exactly like a release
    window[f]('blur', this._cancel)
    document[f]('visibilitychange', this._hidden)
    this.canvas?.[f]('lostpointercapture', this._up)
  }

  uncapture(h) {
    try {
      if (this.canvas?.hasPointerCapture(h.pid)) this.canvas.releasePointerCapture(h.pid)
    } catch {
      // the pointer is already gone
    }
  }

  /**
   * Press on a loose shard (R3F event from Breakage, or the native event from
   * FitLayer's near-miss pick — both carry clientX/Y, pointerId, pointerType).
   * Returns true if it took the piece.
   */
  onShardDown(e, id) {
    // a press on a settled piece starts the mend right away
    if (store.get().phase === 'broken') dispatch({ type: 'BEGIN_FIT' })
    if (!this.active || store.get().phase !== 'fitting') return false
    if (this.placed.has(id) || this.anims.has(id) || this.hold) return false
    const body = this.body(id)
    if (!body) return false
    e.stopPropagation()
    audio.unlock()
    const t = body.translation()
    const pos = new THREE.Vector3(t.x, t.y, t.z)
    // DragControls' plane: facing the camera, through the piece itself; the
    // offset from its centre to where the ray met that plane is kept, so the
    // press moves nothing
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(_dir), pos)
    const offset = new THREE.Vector3()
    if (_ray.copy(rayFromClient(e.clientX, e.clientY, this.camera, this.canvas)).intersectPlane(plane, offset)) {
      offset.sub(pos)
    } else offset.set(0, 0, 0)
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    const quat = new THREE.Quaternion().copy(body.rotation())
    this.hold = {
      id,
      pid: e.pointerId,
      touch: e.pointerType === 'touch',
      x: e.clientX,
      y: e.clientY,
      t: 0, // s held
      plane,
      offset,
      floor: Math.min(FLOOR, pos.y), // never lower than it lay, never pushed up on press
      u0: 1, // the least approach progress seen: the blend starts from here
      pos,
      quat,
      grabbedFrom: pos.clone(),
      grabbedQuat: quat.clone(),
      approach: 0, // 0 far … 1 at the magnet's edge (screen space)
      near: false, // inside the magnet (with hysteresis)
      blocked: !this.borders(id), // no placed neighbour yet
      seated: false, // a release now would fit it
      reason: 'too-far',
      pull: 0,
    }
    this.ring.n = 0
    try {
      // keep the drag's events coming even off the canvas / window
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // not an active pointer (a synthetic press): window listeners still work
    }
    // bring this piece's home round to face the viewer
    const com = this.shard(id).com
    const az = Math.atan2(com.x, com.z)
    this.yawTarget = this.yaw + wrapPi(-az - this.yaw)
    this.idle = 0
    this.ghostId = null
    this.canvas.style.cursor = 'grabbing'
    audio.tok({ position: [t.x, t.y, t.z], strength: 0.22 }) // a quiet pick-up tick
    this.listen(true)
    return true
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
    this.listen(true)
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
    if (this.spin && e.pointerId === this.spin.pid) this.spin = null
    if (this.hold && e.pointerId === this.hold.pid) this.release()
    if (!this.hold && !this.spin) this.listen(false)
  }

  /** Blur / hidden tab: let go of everything, the same way a pointerup would. */
  cancel() {
    this.spin = null
    if (this.hold) this.release()
    this.listen(false)
  }

  /** The one release path (pointerup, cancel, lost capture, blur, hidden). */
  release() {
    const h = this.hold
    this.hold = null
    this.uncapture(h)
    this.canvas.style.cursor = ''
    this.chain = true
    if (this.anims.has(h.id) || this.placed.has(h.id) || !this.body(h.id)) return
    const fitting = this.active && store.get().phase === 'fitting'
    const blocked = !this.borders(h.id)
    if (fitting && h.near && !blocked) this.lock(h.id)
    else if (fitting && h.near) this.reject(h)
    else this.drop(h)
  }

  /** Hand a missed piece back to physics — gently. */
  drop(h) {
    const body = this.body(h.id)
    if (!body) return
    const v = this.releaseVelocity(performance.now(), _v0)
    v.clampLength(0, MAX_DROP_SPEED)
    body.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
    body.setLinvel(v, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  /** Near home but nothing to attach to yet: shake its head, fly it back. */
  reject(h) {
    audio.reject({ position: h.pos.toArray() })
    store.set({ hint: REJECT_HINT }) // while it shakes, not after it has fallen
    setTimeout(() => store.get().hint === REJECT_HINT && store.set({ hint: null }), 2600)
    this.anims.set(h.id, {
      kind: rt.reduced ? 'return' : 'wiggle',
      t: 0,
      dur: rt.reduced ? RETURN_TIME : WIGGLE_TIME,
      arc: RETURN_ARC,
      fromPos: h.pos.clone(),
      fromQuat: h.quat.clone(),
      toPos: h.grabbedFrom,
      toQuat: h.grabbedQuat,
    })
  }

  ringPush(p, t) {
    const r = this.ring
    r.head = (r.head + 1) % RING
    r.p[r.head].copy(p)
    r.t[r.head] = t
    if (r.n < RING) r.n++
  }

  /** Least-squares velocity (m/s) of the held piece over its last ~90 ms. */
  releaseVelocity(now, out) {
    out.set(0, 0, 0)
    const r = this.ring
    if (r.n < 2 || now - r.t[r.head] > VEL_STALE) return out
    const tEnd = r.t[r.head]
    let m = 0
    while (m < r.n) {
      const t = r.t[(r.head - m + RING) % RING]
      if (m >= 2 && tEnd - t > VEL_WINDOW) break
      m++
    }
    let mt = 0
    const mean = _v1.set(0, 0, 0)
    for (let k = 0; k < m; k++) {
      const i = (r.head - k + RING) % RING
      mt += r.t[i]
      mean.add(r.p[i])
    }
    mt /= m
    mean.divideScalar(m)
    let stt = 0
    for (let k = 0; k < m; k++) {
      const i = (r.head - k + RING) % RING
      const dt = r.t[i] - mt
      stt += dt * dt
      out.addScaledVector(_d.subVectors(r.p[i], mean), dt)
    }
    if (stt === 0) return out.set(0, 0, 0)
    return out.multiplyScalar(1000 / stt) // m/ms → m/s
  }

  // --------------------------------------------------------------- snaps

  lock(id) {
    const body = this.body(id)
    if (!body) return
    const t = body.translation()
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    const fromPos = new THREE.Vector3(t.x, t.y, t.z)
    const dist = fromPos.distanceTo(this.homeWorld(id, _a))
    this.anims.set(id, {
      kind: 'snap',
      t: 0,
      dur: Math.min(SNAP_MAX, SNAP_MIN + dist * SNAP_PER_M),
      fromPos,
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
      ...this.seatOf(id),
    })
  }

  /** The seat: pressed a hair toward the placed neighbours, then settling back. */
  seatOf(id) {
    const com = this.shard(id).com
    const dir = new THREE.Vector3()
    let n = 0
    for (const nb of this.adjacency?.get(id) ?? []) {
      if (!this.placed.has(nb)) continue
      dir.add(this.shard(nb).com)
      n++
    }
    if (n > 0) dir.divideScalar(n).sub(com)
    if (dir.lengthSq() < 1e-10) dir.set(0, -1, 0)
    return { seat: true, seated: false, pressDir: dir.normalize(), press: rt.reduced ? 0 : PRESS }
  }

  /** The seat frame: the click lands with the piece, not when it's counted. */
  seatFx(id) {
    if (id === this.anchorId) return
    audio.snap({ position: this.homeWorld(id).toArray() })
    try {
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8)
    } catch {
      // no haptics here
    }
  }

  placedDone(id) {
    this.placed.add(id)
    this.order.push(id)
    this.idle = 0
    this.ghostId = null
    const n = this.placed.size
    const total = this.variant.shards.length
    store.set({ placed: n })
    if (id !== this.anchorId) announce(`Piece ${n} of ${total} placed.`)
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
      ...this.seatOf(id),
    })
    return true
  }

  /** A short kinematic flight to a resting pose, then back to physics, still. */
  sendBack(id, body, toPos, toQuat, dur, arc) {
    const t = body.translation()
    body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.anims.set(id, {
      kind: 'return',
      t: 0,
      dur,
      arc,
      fromPos: new THREE.Vector3(t.x, t.y, t.z),
      fromQuat: new THREE.Quaternion().copy(body.rotation()),
      toPos,
      toQuat,
    })
  }

  // ---------------------------------------------------------------- frame

  frame(dt) {
    if (!this.riding) return
    this.elapsed += dt
    if (!this.hold) this.idle += dt

    // assembly turns toward its target yaw (critically damped); a flip lifts
    // it off the tray and turns it foot-up toward the viewer
    this.yaw += (this._yawTarget - this.yaw) * (1 - Math.exp(-dt / 0.28))
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

    // anchor rise, seats, auto-fit flights, head-shakes, flights back
    let homing = 0
    for (const [id, an] of this.anims) {
      const body = an.body ?? this.body(id)
      if (!body) {
        this.anims.delete(id)
        continue
      }
      an.t += dt
      if (an.kind === 'wiggle') this.frameWiggle(an, body)
      else if (an.kind === 'return') this.frameReturn(id, an, body)
      else if (this.frameHome(id, an, body)) homing++
    }
    if (this.chain) {
      // "mend the rest" flies one piece at a time; a piece still flying back
      // to the tray will set `chain` again when it lands
      this.chain = false
      if (this.autoAll && this.active && homing === 0) this.autoFitNext()
    }

    if (!this.active) return
    if (this.hold) this.frameHold(dt)
    rt.shardBodies?.forEach(this._stray)

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

  /** rise / snap / flight toward home on the assembly. True while still going. */
  frameHome(id, an, body) {
    const k = Math.min(1, an.t / an.dur)
    const home = an.body ? _a.copy(this.assembly.position) : this.homeWorld(id, _a)
    if (an.seat && an.press > 0) {
      // arrive pressed in, then settle back out over the hold
      const s = an.t <= an.dur ? 1 : 1 - easeOut(Math.min(1, (an.t - an.dur) / SEAT_HOLD))
      home.addScaledVector(_c.copy(an.pressDir).applyQuaternion(this.assembly.quaternion), an.press * s)
    }
    if (k < 1) {
      // a seat from release zips in (already moving); flights ease both ends
      const e = an.kind === 'snap' ? easeOut(k) : ease(k)
      _b.lerpVectors(an.fromPos, home, e)
      if (an.kind !== 'snap') _b.y += Math.sin(Math.PI * k) * (an.kind === 'rise' ? 0.05 : 0.06)
      _q.slerpQuaternions(an.fromQuat, this.assembly.quaternion, an.kind === 'snap' ? e : Math.min(1, e * 1.4))
      body.setNextKinematicTranslation(_b)
      body.setNextKinematicRotation(_q)
      return true
    }
    body.setNextKinematicTranslation(home)
    body.setNextKinematicRotation(this.assembly.quaternion)
    if (an.seat) {
      if (!an.seated) {
        an.seated = true
        this.seatFx(id)
      }
      if (an.t < an.dur + SEAT_HOLD) return true
    }
    this.anims.delete(id)
    this.chain = true
    if (!an.body) this.placedDone(id)
    return false
  }

  /** Two damped shakes of the head (±4° yaw) where it was let go. */
  frameWiggle(an, body) {
    const k = Math.min(1, an.t / an.dur)
    _q.setFromAxisAngle(_yAxis, WIGGLE_ANGLE * Math.sin(4 * Math.PI * k) * (1 - k)).multiply(an.fromQuat)
    body.setNextKinematicTranslation(an.fromPos)
    body.setNextKinematicRotation(_q)
    if (k >= 1) {
      an.kind = 'return'
      an.t = 0
      an.dur = RETURN_TIME
    }
  }

  /** Kinematic flight to a resting pose; lands as a still Dynamic body. */
  frameReturn(id, an, body) {
    const k = Math.min(1, an.t / an.dur)
    if (k < 1) {
      const e = ease(k)
      _b.lerpVectors(an.fromPos, an.toPos, e)
      _b.y += Math.sin(Math.PI * k) * an.arc
      _q.slerpQuaternions(an.fromQuat, an.toQuat, e)
      body.setNextKinematicTranslation(_b)
      body.setNextKinematicRotation(_q)
      return
    }
    this.anims.delete(id)
    this.chain = true
    // a Dynamic body ignores kinematic targets: put it exactly there, at rest
    body.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
    body.setTranslation(an.toPos, true)
    body.setRotation(an.toQuat, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  frameHold(dt) {
    const h = this.hold
    const body = this.body(h.id)
    if (!body) return
    const cam = this.camera
    h.t += dt

    // screen scale at the home, from the live projection (so the 6× loupe's
    // view offset is accounted for), and the magnet's reach there
    const home = this.homeWorld(h.id, _b)
    toClient(home, cam, this.canvas, _c2)
    const pxPerM = ((canvasRect(this.canvas).height / 2) * cam.projectionMatrix.elements[5]) / cam.position.distanceTo(home)
    const tol = snapTolerance(h.touch, pxPerM)
    const radius = magnetRadius(h.touch, tol)

    // approach: 0 → 1 as the pointer closes from APPROACH_PX (or from wherever
    // it was pressed, if nearer) to the magnet's edge — never jumps on press
    const u = approachProgress(Math.hypot(h.x - _c2.x, h.y - _c2.y), radius * pxPerM, APPROACH_PX)
    h.u0 = Math.min(h.u0, u)
    const t = h.u0 < 1 ? Math.max(0, (u - h.u0) / (1 - h.u0)) : 0
    h.approach = t

    // where the pointer puts it: on the grab plane minus the grab offset,
    // blending toward the home's depth with the offset fading out
    const ray = _ray.copy(rayFromClient(h.x, h.y, cam, this.canvas))
    if (!ray.intersectPlane(h.plane, _hit)) return
    if (_hit.y - h.offset.y < h.floor) {
      // the plane dips into the tray toward the viewer: slide along it instead
      _floor.constant = -(h.floor + h.offset.y)
      if (!ray.intersectPlane(_floor, _hit)) return
    }
    const target = _a.copy(_hit)
    if (t > 0) {
      _plane.normal.copy(h.plane.normal)
      _plane.constant = -_plane.normal.dot(home)
      if (ray.intersectPlane(_plane, _c)) target.lerp(_c, t)
    }
    target.addScaledVector(h.offset, t - 1)
    // the pick-up hover, critically damped in, gone by the time it's home
    const s = h.t / LIFT_TAU
    target.y += LIFT * (1 - Math.exp(-s) * (1 + s)) * (1 - t)
    target.y = Math.max(h.floor, target.y)

    // magnet: screen-space distance to home, in metres at the home's depth
    toClient(target, cam, this.canvas, _c1)
    const dist = Math.hypot(_c1.x - _c2.x, _c1.y - _c2.y) / pxPerM
    _why.id = h.id
    _why.placed = this.placed
    _why.adjacency = this.adjacency
    _why.dist = dist
    _why.tol = tol
    h.reason = lockReason(_why)
    h.seated = h.reason === 'ok'
    h.blocked = !this.borders(h.id)
    h.near = magnetHeld(dist, radius, h.near)
    // a piece that can't attach yet isn't pulled — the ghost says why instead
    const pull = h.blocked ? 0 : magnetAssist(dist, tol, radius, h.near)
    h.pull += (pull - h.pull) * (1 - Math.exp(-dt / PULL_TAU))
    // seated preview: fully home while still in hand; the release commits it
    if (h.seated) target.copy(home)
    else target.lerp(home, h.pull)

    h.pos.lerp(target, 1 - Math.exp(-dt / FOLLOW_TAU))
    h.quat.slerp(this.assembly.quaternion, 1 - Math.exp(-dt / TURN_TAU))
    body.setNextKinematicTranslation(h.pos)
    body.setNextKinematicRotation(h.quat)
    this.ringPush(h.pos, performance.now())
  }

  /**
   * Anything that escapes the tray flies back to its edge. Per frame only
   * awake bodies are checked (a shard resting against a wall is not a stray);
   * begin() sweeps them all.
   */
  stray(body, id, all) {
    if (this.placed.has(id) || this.anims.has(id) || this.hold?.id === id) return
    if (!all && body.isSleeping()) return
    const t = body.translation()
    if (t.y > STRAY_Y && Math.abs(t.x) < STRAY_X && Math.abs(t.z) < STRAY_Z) return
    const to = new THREE.Vector3(THREE.MathUtils.clamp(t.x, -0.15, 0.15), 0.025, THREE.MathUtils.clamp(t.z, -0.09, 0.09))
    this.sendBack(id, body, to, new THREE.Quaternion().copy(body.rotation()), STRAY_TIME, STRAY_ARC)
  }
}
