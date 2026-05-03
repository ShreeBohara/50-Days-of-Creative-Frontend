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
export default function useFlightCamera(curve, { baseSpeed = 0.0003, meshRef } = {}) {
  const progressRef = useRef(0)
  const targetLookAt = useRef(new THREE.Vector3())
  const mouse = useRef({ x: 0, y: 0 })

  /* Track mouse movement */
  const onMouseMove = useCallback((e) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
  }, [])

  /* Attach event listener */
  useMemo(() => {
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [onMouseMove])

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
    const baseLookAt = curve.getPointAt(lookAheadT)

    /* Add subtle mouse sway to the lookAt target */
    targetLookAt.current.copy(baseLookAt)
    targetLookAt.current.x += mouse.current.x * 2.0
    targetLookAt.current.y += mouse.current.y * 2.0

    /* Smoothly interpolate camera rotation for organic feel */
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    currentLookAt.add(camera.position) // Convert direction to target point
    currentLookAt.lerp(targetLookAt.current, 0.05)
    camera.lookAt(currentLookAt)

    /* Update shader mouse influence if material is available */
    if (meshRef?.current?.material?.uniforms?.u_mouseInfluence) {
      const uMouse = meshRef.current.material.uniforms.u_mouseInfluence.value
      uMouse.lerp(new THREE.Vector2(mouse.current.x, mouse.current.y), 0.05)
    }
  })

  return { progressRef }
}
