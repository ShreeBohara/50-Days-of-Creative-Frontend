import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { rt } from '../state/store.js'

// <Physics> runs paused; this steps it by hand so time can slow for the
// break (rt.clock.scale) without the stutter a fixed 1/120 step would show at
// 0.2× — each frame's simulated time is split into ≤1/120 s sub-steps.
const MAX_SUBSTEP = 1 / 120

export default function PhysicsClock() {
  const { step, world, rapier } = useRapier()
  useEffect(() => {
    rt.world = world
    rt.rapier = rapier
  }, [world, rapier])
  useFrame((_, dt) => {
    const sim = Math.min(dt, 1 / 30) * rt.clock.scale
    if (sim <= 0) return
    const n = Math.max(1, Math.ceil(sim / MAX_SUBSTEP))
    for (let i = 0; i < n; i++) step(sim / n)
  }, -10)
  return null
}
