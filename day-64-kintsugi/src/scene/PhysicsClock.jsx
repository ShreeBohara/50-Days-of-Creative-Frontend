import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { rt } from '../state/store.js'

// <Physics> runs paused; this steps it by hand on a FIXED 1/120 s tick
// ("Fix Your Timestep"): the renderer produces time, the simulation consumes
// it in equal steps, so resting shards don't jitter and a drop behaves the
// same on a 60 Hz laptop and a 120 Hz display. Dynamic bodies are then drawn
// between their last two states (alpha = leftover / H), which is also what
// keeps the 0.25× break smooth when a tick only lands every few frames.
const H = 1 / 120
const MAX_STEPS = 4 // after a hitch, drop the backlog rather than spiral
const TELEPORT = 0.05 // m: a jump this big between ticks was a setTranslation — don't smear it

const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _m = new THREE.Matrix4()

class FixedClock {
  constructor() {
    this.acc = 0
    this.prev = new Map() // body handle -> pose before the latest tick
    this.kin = [] // kinematic targets to spread over this frame's ticks
    this.tick = 0
  }

  frame(dt, states, step) {
    const frozen = rt.clock.scale === 0
    // Frozen (the instant of impact): draw the latest state, not one a tick
    // behind — the shards that replace the bowl spawn at its physics pose.
    if (frozen) this.acc = 0
    this.acc += Math.min(dt, 1 / 30) * rt.clock.scale
    const steps = Math.min(MAX_STEPS, Math.floor(this.acc / H))
    if (steps > 0) {
      // Controllers set one kinematic target per frame (priority -20). Spread
      // it over this frame's ticks so a held piece moves evenly instead of
      // covering the whole distance in the first tick and resting after.
      const kin = this.kin
      kin.length = 0
      if (steps > 1) {
        states.forEach((state) => {
          const b = state.rigidBody
          if (!b.isKinematic() || !b.isEnabled()) return
          const t = b.translation()
          const n = b.nextTranslation()
          const r = b.rotation()
          const nr = b.nextRotation()
          if (t.x === n.x && t.y === n.y && t.z === n.z && r.x === nr.x && r.y === nr.y && r.z === nr.z && r.w === nr.w) return
          kin.push({ b, t, n, r, nr })
        })
      }
      for (let i = 0; i < steps; i++) {
        this.tick++
        states.forEach((state, handle) => {
          const b = state.rigidBody
          if (!b.isDynamic() || b.isSleeping()) return
          let e = this.prev.get(handle)
          if (!e) this.prev.set(handle, (e = { p: new THREE.Vector3(), q: new THREE.Quaternion(), tick: 0 }))
          e.p.copy(b.translation())
          const r = b.rotation()
          e.q.set(r.x, r.y, r.z, r.w)
          e.tick = this.tick
        })
        if (kin.length) {
          const k = (i + 1) / steps
          for (const { b, t, n, r, nr } of kin) {
            b.setNextKinematicTranslation({ x: t.x + (n.x - t.x) * k, y: t.y + (n.y - t.y) * k, z: t.z + (n.z - t.z) * k })
            _q.set(r.x, r.y, r.z, r.w).slerp(_q2.set(nr.x, nr.y, nr.z, nr.w), k)
            b.setNextKinematicRotation(_q)
          }
        }
        step(H)
        this.acc -= H
        // an impact inside this tick froze the world: don't run the rest
        if (rt.clock.scale === 0) {
          this.acc = 0
          break
        }
      }
      if (this.acc >= H) this.acc %= H
    }

    // draw awake dynamic bodies between their previous and current tick
    const alpha = frozen ? 1 : this.acc / H
    states.forEach((state, handle) => {
      const b = state.rigidBody
      if (state.meshType !== 'mesh') return
      if (b.isKinematic() && b.isEnabled()) {
        // Held and flying pieces are drawn at the pose their controller asked
        // for this frame: on a display faster than the tick some frames run no
        // tick at all, and the piece in hand must still move every frame.
        const n = b.nextTranslation()
        const nr = b.nextRotation()
        _m.compose(_s.set(n.x, n.y, n.z), _q.set(nr.x, nr.y, nr.z, nr.w), state.scale)
          .premultiply(state.invertedWorldMatrix)
          .decompose(_p, _q, _s)
        state.object.position.copy(_p)
        state.object.quaternion.copy(_q)
        return
      }
      if (!b.isDynamic() || b.isSleeping()) return
      const e = this.prev.get(handle)
      if (!e || e.tick !== this.tick) return // not awake through the last tick
      const t = b.translation()
      if (Math.abs(t.x - e.p.x) + Math.abs(t.y - e.p.y) + Math.abs(t.z - e.p.z) > TELEPORT) return
      const r = b.rotation()
      _p.copy(e.p).lerp(_s.set(t.x, t.y, t.z), alpha)
      _q.copy(e.q).slerp(_q2.set(r.x, r.y, r.z, r.w), alpha)
      _m.compose(_p, _q, state.scale).premultiply(state.invertedWorldMatrix).decompose(_p, _q, _s)
      state.object.position.copy(_p)
      state.object.quaternion.copy(_q)
    })
  }
}

export default function PhysicsClock() {
  const { step, world, rapier, rigidBodyStates } = useRapier()
  const clock = useMemo(() => new FixedClock(), [])
  useEffect(() => {
    rt.world = world
    rt.rapier = rapier
  }, [world, rapier])
  useFrame((_, dt) => clock.frame(dt, rigidBodyStates, step), -10)
  return null
}
