import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * useFlightCamera — Drives the camera forward along a spline curve,
 * looping seamlessly when it reaches the end.
 *
 * @param {THREE.CatmullRomCurve3} curve - The tunnel spline
 * @param {object} opts
 * @param {number} opts.baseSpeed - Base flight speed (0-1 normalized per frame)
 */
export default function useFlightCamera(curve, { baseSpeed = 0.0003 } = {}) {
  const progressRef = useRef(0)

  useFrame((state, delta) => {
    if (!curve) return

    const camera = state.camera

    /* Advance along the curve (clamp delta to avoid huge jumps on tab-switch) */
    const clampedDelta = Math.min(delta, 0.1)
    progressRef.current += baseSpeed * clampedDelta * 60

    /* Seamless loop: wrap progress around 0–0.98 (keep margin so lookAt works) */
    if (progressRef.current >= 0.98) {
      progressRef.current = 0
    }

    /* Position camera on the curve */
    const pos = curve.getPointAt(progressRef.current)
    camera.position.copy(pos)

    /* Look slightly ahead on the curve for flight direction */
    const lookAheadT = Math.min(progressRef.current + 0.01, 0.99)
    const lookAt = curve.getPointAt(lookAheadT)
    camera.lookAt(lookAt)
  })

  return { progressRef }
}
