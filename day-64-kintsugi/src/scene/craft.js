// Lacquer → gild → burnish. One imperative controller for the three craft
// stages: which tool is in hand, where it hovers, what a stroke does to each
// seam's state, gold dust, and when a stage is done.
//
// Seam state (one RGBA float texel per active seam, read by the ribbon shader):
//   r, g  lacquered arclength interval [lo, hi] — brushing near a crack wets
//         it where you touch, and the urushi then runs along the crack both
//         ways as you keep stroking;
//   b     gold coverage 0..1 — dust that lands near wet lacquer sticks;
//   a     polish 0..1 — rubbing with the agate turns powder to mirror.

import * as THREE from 'three'
import { audio } from '../audio/engine.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { rayFromClient } from '../input/pointer.js'

const CORRIDOR = { mouse: 26, touch: 44 } // px either side of a crack
const LACQUER_GAIN = 2.4 // metres of spread per metre of stroke
const DONE_AT = { lacquer: 0.93, gild: 0.92, burnish: 0.9 }
const MAX_DUST = 2600
const DUST_RATE = 420 // flakes per second while sifting
const SIFT_SPIN = 0.75 // rad/s the bowl turns under the jar

const _v = new THREE.Vector3()
const _n = new THREE.Vector3()
const _cam = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _nm = new THREE.Matrix3()
const _toCam = new THREE.Vector3()
const _down = new THREE.Vector3(0, -1, 0)
const _q = new THREE.Quaternion()
const _up = new THREE.Vector3(0, 1, 0)
const raycaster = new THREE.Raycaster()

function hash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

export class Craft {
  constructor() {
    this.stage = null
    this.tool = null
    this.pointer = { x: -1, y: -1, down: false, touch: false, id: null, over: false, lastX: 0, lastY: 0 }
    this.seams = []
    this.state = null
    this.tex = null
    this.parent = null
    this.screen = [] // per seam Float32Array(n*2) + facing Uint8Array
    this.dust = null
    this.dustCount = 0
    this.progressT = 0
    this.done = false
    this._move = (e) => this.onMove(e)
    this._down = (e) => this.onDown(e)
    this._up = (e) => this.onUp(e)
  }

  bind({ camera, canvas }) {
    this.camera = camera
    this.canvas = canvas
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerdown', this._down)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
  }

  unbind() {
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerdown', this._down)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
  }

  /** Called when the ribbons exist: seams (prepared), state buffer, parent. */
  attach({ seams, state, tex, parent, dust }) {
    this.seams = seams
    this.state = state
    this.tex = tex
    this.parent = parent
    this.dust = dust
    this.screen = seams.map((s) => ({ xy: new Float32Array(s.n * 2), face: new Uint8Array(s.n) }))
    this.lengths = seams.map((s) => s.length)
    this.total = this.lengths.reduce((a, b) => a + b, 0) || 1
  }

  setStage(stage) {
    this.stage = stage
    this.done = false
    this.returnTool()
    store.set({ progress: this.measure(), tool: null })
  }

  // ------------------------------------------------------------------ tools

  pickTool(name) {
    const want = { lacquer: 'brush', gild: 'jar', burnish: 'burnisher' }[this.stage]
    if (!want) return
    audio.unlock()
    if (name !== want) {
      audio.reject({})
      const hint = { brush: 'the brush first', jar: 'the gold is in the jar', burnisher: 'the agate polishes' }[want]
      store.set({ hint })
      announce(`Not that one: ${hint}.`)
      setTimeout(() => store.get().hint === hint && store.set({ hint: null }), 2200)
      return
    }
    if (this.tool === name) return
    const obj = rt.tools?.[name]
    if (!obj) return
    this.tool = name
    this.toolPose = { p: obj.position.clone(), q: obj.quaternion.clone() }
    if (name === 'jar') this.lidOpen = 0
    this.canvas.style.cursor = 'none'
    store.set({ tool: name, hint: null })
    announce(
      {
        brush: 'Brush in hand. Brush the cracks, or hold Space.',
        jar: 'Gold in hand. Hold to sift as the bowl turns.',
        burnisher: 'Agate in hand. Rub the gold, or hold Space.',
      }[name],
    )
    if (name === 'jar') audio.lid({ position: obj.position.toArray() })
  }

  returnTool() {
    if (!this.tool) return
    this.returning = { name: this.tool, t: 0 }
    this.tool = null
    this.pointer.down = false
    this.canvas && (this.canvas.style.cursor = '')
    audio.brushStop()
    audio.burnishStop()
  }

  // ------------------------------------------------------------------ input

  onMove(e) {
    const p = this.pointer
    if (p.id != null && e.pointerId !== p.id) return
    p.x = e.clientX
    p.y = e.clientY
    p.touch = e.pointerType === 'touch'
  }

  onDown(e) {
    if (!this.tool || !this.stage) return
    if (e.target !== this.canvas) return
    const p = this.pointer
    p.id = e.pointerId
    p.x = p.lastX = e.clientX
    p.y = p.lastY = e.clientY
    p.touch = e.pointerType === 'touch'
    const onBowl = !!this.hitBowl(e.clientX, e.clientY)
    // the press that just took a tool off the tray (or tapped the shelf) is
    // not a stroke, a pour or a spin
    if (e.__kintsugiHit && !onBowl) return
    if (this.tool === 'jar' || onBowl) {
      p.down = true
      if (this.tool === 'brush') audio.brushStart()
      if (this.tool === 'burnisher') audio.burnishStart()
    } else {
      // a press off the bowl turns it instead
      this.spin = { x: e.clientX, yaw0: rt.fit?.yawTarget ?? 0 }
    }
  }

  onUp(e) {
    const p = this.pointer
    if (p.id != null && e.pointerId !== p.id) return
    p.down = false
    p.id = null
    this.spin = null
    audio.brushStop()
    audio.burnishStop()
  }

  hitBowl(x, y) {
    const meshes = rt.craftMeshes?.() ?? []
    if (!meshes.length || !this.camera) return null
    raycaster.ray.copy(rayFromClient(x, y, this.camera, this.canvas))
    const hits = raycaster.intersectObjects(meshes, false)
    return hits[0] ?? null
  }

  // ---------------------------------------------------------------- measure

  measure() {
    if (!this.state || !this.seams.length) return 0
    let acc = 0
    for (let i = 0; i < this.seams.length; i++) {
      const L = this.lengths[i]
      const lo = this.state[i * 4]
      const hi = this.state[i * 4 + 1]
      if (this.stage === 'lacquer') acc += Math.max(0, Math.min(L, hi) - Math.max(0, lo))
      else if (this.stage === 'gild') acc += L * this.state[i * 4 + 2]
      else if (this.stage === 'burnish') acc += L * this.state[i * 4 + 3]
    }
    return Math.min(1, acc / this.total)
  }

  complete() {
    // finish the last few percent with a satisfying sweep rather than hunting
    const s = this.state
    for (let i = 0; i < this.seams.length; i++) {
      if (this.stage === 'lacquer') {
        s[i * 4] = 0
        s[i * 4 + 1] = this.lengths[i]
      } else if (this.stage === 'gild') s[i * 4 + 2] = 1
      else if (this.stage === 'burnish') s[i * 4 + 3] = 1
    }
    this.tex.needsUpdate = true
    this.done = true
    store.set({ progress: 1 })
    const stage = this.stage
    this.returnTool()
    const next = { lacquer: 'LACQUER_DONE', gild: 'GILD_DONE', burnish: 'BURNISH_DONE' }[stage]
    const say = {
      lacquer: 'Every seam is lacquered. Now the gold.',
      gild: 'Gold dust has settled on every seam. Burnish it.',
      burnish: 'The gold is polished. The bowl is mended.',
    }[stage]
    setTimeout(() => {
      dispatch({ type: next })
      announce(say)
      if (stage === 'burnish') audio.chime()
    }, 500)
  }

  // --------------------------------------------------------------- keyboard

  /**
   * Space held with a tool in hand: apply it without a pointer. The brush
   * runs along the first unfinished seam, the jar pours as the bowl turns,
   * the agate polishes seam by seam.
   */
  keyApply(dt) {
    if (!this.tool || this.done || !this.state) return false
    const st = this.state
    if (this.tool === 'jar') {
      if (rt.fit) rt.fit.yawTarget += SIFT_SPIN * dt
      if (this.pourAz != null) this.gildBand(this.pourAz - (rt.fit?.yaw ?? 0), dt)
      this.spawnDust(dt)
      audio.goldSift(0.6)
    } else {
      const i = this.seams.findIndex((s, k) =>
        this.tool === 'brush' ? st[k * 4] > 0 || st[k * 4 + 1] < s.length : st[k * 4 + 3] < 1,
      )
      if (i < 0) return false
      const s = this.seams[i]
      if (this.tool === 'brush') {
        if (st[i * 4 + 1] <= st[i * 4]) st[i * 4 + 1] = st[i * 4] = s.length / 2
        const grow = dt * 0.09
        st[i * 4] = Math.max(0, st[i * 4] - grow)
        st[i * 4 + 1] = Math.min(s.length, st[i * 4 + 1] + grow)
        audio.brushUpdate(0.5)
      } else {
        st[i * 4 + 3] = Math.min(1, st[i * 4 + 3] + dt * 2.2)
        audio.burnishUpdate(0.6)
      }
      // keep the seam being worked turned toward the viewer
      const mid = Math.floor(s.n / 2)
      if (rt.fit) {
        const az = Math.atan2(s.pos[mid * 3], s.pos[mid * 3 + 2])
        const y = rt.fit.yaw
        rt.fit.yawTarget = y + Math.atan2(Math.sin(-az - y), Math.cos(-az - y))
      }
    }
    this.tex.needsUpdate = true
    return true
  }

  // ------------------------------------------------------------------ frame

  projectSeams() {
    const cam = this.camera
    const rect = this.canvas.getBoundingClientRect()
    const mw = this.parent.matrixWorld
    _m.copy(mw)
    _nm.getNormalMatrix(mw)
    cam.getWorldPosition(_cam)
    for (let i = 0; i < this.seams.length; i++) {
      const s = this.seams[i]
      const out = this.screen[i]
      for (let k = 0; k < s.n; k++) {
        _v.fromArray(s.pos, k * 3).applyMatrix4(_m)
        _n.fromArray(s.nrm, k * 3).applyMatrix3(_nm).normalize()
        _toCam.subVectors(_cam, _v).normalize()
        out.face[k] = _n.dot(_toCam) > 0.08 ? 1 : 0
        _v.project(cam)
        out.xy[k * 2] = rect.left + (_v.x * 0.5 + 0.5) * rect.width
        out.xy[k * 2 + 1] = rect.top + (-_v.y * 0.5 + 0.5) * rect.height
      }
    }
  }

  /** Nearest visible seam point to the pointer: { i, k, d } or null. */
  nearest(maxPx) {
    const p = this.pointer
    let best = null
    for (let i = 0; i < this.seams.length; i++) {
      const { xy, face } = this.screen[i]
      for (let k = 0; k < face.length; k++) {
        if (!face[k]) continue
        const d = Math.hypot(xy[k * 2] - p.x, xy[k * 2 + 1] - p.y)
        if (d <= maxPx && (!best || d < best.d)) best = { i, k, d }
      }
    }
    return best
  }

  pxPerMetre(worldPoint) {
    const rect = this.canvas.getBoundingClientRect()
    const depth = this.camera.position.distanceTo(worldPoint)
    // projectionMatrix[5] = cot(fov/2) × loupe zoom, so strokes stay honest under the loupe
    return ((rect.height / 2) * this.camera.projectionMatrix.elements[5]) / depth
  }

  frame(dt, time) {
    if (!this.stage || !this.parent || !this.state) {
      this.frameReturn(dt)
      return
    }
    const p = this.pointer
    const stroke = Math.hypot(p.x - p.lastX, p.y - p.lastY)
    p.lastX = p.x
    p.lastY = p.y

    if (this.spin) {
      if (rt.fit) rt.fit.yawTarget = this.spin.yaw0 + (p.x - this.spin.x) * 0.012
    }

    const hit = this.tool && this.tool !== 'jar' && p.x >= 0 ? this.hitBowl(p.x, p.y) : null
    this.frameTool(dt, hit, time)
    this.frameReturn(dt)
    if (this.done) return

    let changed = false
    if (this.tool === 'brush' && p.down && hit) {
      this.projectSeams()
      const near = this.nearest(p.touch ? CORRIDOR.touch : CORRIDOR.mouse)
      audio.brushUpdate(Math.min(1, stroke / 18))
      if (near) {
        const s = this.seams[near.i]
        const st = this.state
        const at = s.arclen[near.k]
        const grow = (stroke / this.pxPerMetre(hit.point)) * LACQUER_GAIN * 0.5 + dt * 0.004
        let lo = st[near.i * 4]
        let hi = st[near.i * 4 + 1]
        if (hi <= lo) {
          lo = at - 0.0015
          hi = at + 0.0015
        }
        lo = Math.max(0, Math.min(lo, at) - grow)
        hi = Math.min(s.length, Math.max(hi, at) + grow)
        st[near.i * 4] = lo
        st[near.i * 4 + 1] = hi
        changed = true
      }
    } else if (this.tool === 'burnisher' && p.down && hit) {
      this.projectSeams()
      const near = this.nearest(p.touch ? CORRIDOR.touch + 10 : CORRIDOR.mouse + 8)
      audio.burnishUpdate(Math.min(1, stroke / 22))
      if (near && stroke > 0.5) {
        const i = near.i
        const L = Math.max(this.lengths[i], 0.02)
        const rub = (stroke / this.pxPerMetre(hit.point)) * 2.8
        this.state[i * 4 + 3] = Math.min(1, this.state[i * 4 + 3] + rub / L)
        changed = true
      }
    } else if (this.tool === 'jar') {
      if (p.down) {
        if (rt.fit) rt.fit.yawTarget += SIFT_SPIN * dt
        this.spawnDust(dt)
        audio.goldSift(0.6)
        // the stream falls on the rim under the mouth and runs down both walls:
        // gild the vertical band of the bowl beneath it (bowl-local azimuth)
        if (this.pourAz != null) changed = this.gildBand(this.pourAz - (rt.fit?.yaw ?? 0), dt) || changed
      }
    }
    if (this.dust) this.frameDust(dt)

    if (changed) this.tex.needsUpdate = true
    this.progressT += dt
    if (this.progressT > 0.12) {
      this.progressT = 0
      const prog = this.measure()
      store.set({ progress: prog })
      if (prog >= DONE_AT[this.stage]) this.complete()
    }
  }

  // --------------------------------------------------------------- tool pose

  frameTool(dt, hit, time) {
    if (!this.tool) return
    const obj = rt.tools?.[this.tool]
    if (!obj) return
    const cam = this.camera
    const right = _v.set(1, 0, 0).applyQuaternion(cam.quaternion).clone()
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(cam.quaternion)
    const target = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    if (this.tool === 'jar') {
      // The jar hovers over the rim — pointer x slides it round the near side —
      // tilted to pour; the bowl turns beneath it, so one slow revolution
      // passes every crack under the stream of gold.
      const A = rt.assembly
      const rect = this.canvas.getBoundingClientRect()
      const u = THREE.MathUtils.clamp(((this.pointer.x - rect.left) / rect.width - 0.5) * 2, -1, 1)
      const camAz = Math.atan2(cam.position.x - A.position.x, cam.position.z - A.position.z)
      const phi = camAz + u * 0.9
      this.pourAz = phi
      const mouthTarget = new THREE.Vector3(Math.sin(phi) * 0.057, 0.132, Math.cos(phi) * 0.057).add(A.position)
      const tilt = this.pointer.down ? 1.05 : 0.45
      // tip toward the bowl's axis
      const axis = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi))
      quat.setFromAxisAngle(axis, tilt)
      const mouthLocal = new THREE.Vector3(0, 0.03, 0).applyQuaternion(quat)
      target.copy(mouthTarget).sub(mouthLocal)
      this.lidOpen += ((this.pointer.down ? 1 : 0.6) - this.lidOpen) * (1 - Math.exp(-dt / 0.12))
      this.poseLid(this.lidOpen)
      this.mouth = obj.localToWorld(new THREE.Vector3(0, 0.03, 0))
    } else {
      // brush / agate: tip on the glaze under the pointer, handle toward you
      const tipLocal = this.tool === 'brush' ? 0.1415 : 0.1125
      const lift = this.pointer.down ? 0.0006 : 0.006
      if (hit) {
        _n.copy(hit.face?.normal ?? _up).transformDirection(hit.object.matrixWorld)
        target.copy(hit.point).addScaledVector(_n, lift)
      } else {
        // off the bowl it floats on a camera-facing plane just in front of it
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(back, new THREE.Vector3(-0.012, 0.05, 0.03))
        const ray = rayFromClient(this.pointer.x, this.pointer.y, cam, this.canvas)
        if (!ray.intersectPlane(plane, target)) target.set(0, 0.1, 0.1)
      }
      const handleDir = new THREE.Vector3().addScaledVector(right, 0.35).addScaledVector(_up, 0.85).addScaledVector(back, 0.35).normalize()
      // a small idle waver makes the tool feel held by a hand
      handleDir.x += Math.sin(time * 1.7) * 0.02
      handleDir.normalize()
      quat.setFromUnitVectors(_up, handleDir.clone().negate())
      target.addScaledVector(handleDir, tipLocal)
    }
    const k = 1 - Math.exp(-dt / 0.045)
    this.toolPose.p.lerp(target, k)
    this.toolPose.q.slerp(quat, 1 - Math.exp(-dt / 0.08))
    obj.position.copy(this.toolPose.p)
    obj.quaternion.copy(this.toolPose.q)
  }

  poseLid(open) {
    const lid = rt.tools?.lid
    if (!lid) return
    if (!this.lidRest) this.lidRest = { p: lid.position.clone(), q: lid.quaternion.clone() }
    const hinge = new THREE.Vector3(0, 0.028, -0.0188) // back edge of the jar mouth, jar-local
    const angle = -open * 1.9
    _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle)
    lid.position.copy(this.lidRest.p).sub(hinge).applyQuaternion(_q).add(hinge)
    lid.quaternion.copy(_q).multiply(this.lidRest.q)
  }

  frameReturn(dt) {
    const r = this.returning
    if (!r) return
    const obj = rt.tools?.[r.name]
    const home = rt.toolHome?.(r.name) // the tray's current layout (portrait-aware)
    if (!obj || !home) {
      this.returning = null
      return
    }
    r.t += dt
    const k = 1 - Math.exp(-dt / 0.12)
    obj.position.lerp(home.p, k)
    obj.quaternion.slerp(home.q, k)
    if (r.name === 'jar' && this.lidRest) {
      this.lidOpen = (this.lidOpen ?? 0) * (1 - k)
      this.poseLid(this.lidOpen)
    }
    if (r.t > 1.2) {
      obj.position.copy(home.p)
      obj.quaternion.copy(home.q)
      this.returning = null
    }
  }

  // -------------------------------------------------------------------- dust

  spawnDust(dt) {
    const d = this.dust
    if (!d || !this.mouth) return
    const n = Math.min(Math.round(DUST_RATE * dt + Math.random()), 12)
    if (!n) return
    // every flake leaves the mouth within 12 mm: one ray finds the landing for
    // the whole batch, each flake then offsets it by its own spread
    raycaster.set(this.mouth, _down)
    const hits = raycaster.intersectObjects(rt.craftMeshes?.() ?? [], false)
    const hit = hits[0]?.point
    for (let j = 0; j < n; j++) {
      const i = d.next
      d.next = (d.next + 1) % MAX_DUST
      const r = hash(i + d.seq) * 0.012
      const a = hash(i * 3.1 + d.seq) * Math.PI * 2
      d.pos[i * 3] = this.mouth.x + Math.cos(a) * r
      d.pos[i * 3 + 1] = this.mouth.y
      d.pos[i * 3 + 2] = this.mouth.z + Math.sin(a) * r
      d.vel[i * 3] = (hash(i + 7.7) - 0.5) * 0.08
      d.vel[i * 3 + 1] = -0.05 - hash(i + 2.2) * 0.1
      d.vel[i * 3 + 2] = (hash(i + 5.5) - 0.5) * 0.08
      d.state[i] = 1 // falling
      d.life[i] = 0
      d.spin[i] = hash(i + 9.1) * 6.28
      d.seq += 0.618
      d.land[i] = hit ? hit.y : 0.0005
      d.onBowl[i] = hit ? 1 : 0
      if (hit) {
        d.hit[i * 3] = hit.x + (d.pos[i * 3] - this.mouth.x)
        d.hit[i * 3 + 1] = hit.y
        d.hit[i * 3 + 2] = hit.z + (d.pos[i * 3 + 2] - this.mouth.z)
      }
    }
  }

  frameDust(dt) {
    const d = this.dust
    for (let i = 0; i < MAX_DUST; i++) {
      const s = d.state[i]
      if (s === 0) continue
      d.life[i] += dt
      if (s === 1) {
        d.vel[i * 3 + 1] -= 9.81 * dt * 0.35 // fine powder drifts down slower than gravity
        d.pos[i * 3] += d.vel[i * 3] * dt
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt
        if (d.pos[i * 3 + 1] <= d.land[i]) {
          if (d.onBowl[i]) {
            // most settles into the lacquer; some skips off the glaze
            const stays = hash(i + d.seq) < 0.6
            d.state[i] = stays ? 2 : 3
            if (!stays) {
              d.vel[i * 3] = (hash(i + 1.3) - 0.5) * 0.25
              d.vel[i * 3 + 1] = 0.12
              d.vel[i * 3 + 2] = (hash(i + 4.4) - 0.5) * 0.25
              d.land[i] = 0.0005
              d.onBowl[i] = 0
            }
          } else {
            d.state[i] = 4 // on the tray
            d.pos[i * 3 + 1] = 0.0006
          }
          d.life[i] = 0
        }
      } else if (s === 3) {
        // bounced off bare glaze, falling to the tray
        d.vel[i * 3 + 1] -= 9.81 * dt * 0.6
        d.pos[i * 3] += d.vel[i * 3] * dt
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt
        if (d.pos[i * 3 + 1] <= 0.0006) {
          d.pos[i * 3 + 1] = 0.0006
          d.state[i] = 4
          d.life[i] = 0
        }
      } else if ((s === 2 && d.life[i] > 0.5) || (s === 4 && d.life[i] > 2.4)) {
        d.state[i] = 0
      }
    }
  }

  /**
   * Gold dust falling on the rim at bowl-local azimuth `az` runs down both
   * walls: every lacquered seam point inside that ±8 mm vertical band takes
   * gold in proportion to how much of its seam the band covers. One slow
   * revolution under the jar saturates every seam.
   */
  gildBand(az, dt) {
    const st = this.state
    let hitAny = false
    for (let i = 0; i < this.seams.length; i++) {
      const lo = st[i * 4]
      const hi = st[i * 4 + 1]
      if (hi <= lo || st[i * 4 + 2] >= 1) continue
      const s = this.seams[i]
      let hits = 0
      for (let k = 0; k < s.n; k++) {
        const x = s.pos[k * 3]
        const z = s.pos[k * 3 + 2]
        const r = Math.hypot(x, z)
        let d = Math.atan2(x, z) - az
        d = Math.atan2(Math.sin(d), Math.cos(d))
        if (Math.abs(d) * Math.max(r, 0.012) > 0.008) continue
        const a = s.arclen[k]
        if (a >= lo && a <= hi) hits++
      }
      if (hits) {
        st[i * 4 + 2] = Math.min(1, st[i * 4 + 2] + (dt * 3.8 * hits) / s.n)
        hitAny = true
      }
    }
    return hitAny
  }
}

export { MAX_DUST }
