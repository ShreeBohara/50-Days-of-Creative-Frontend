/**
 * CameraRig.jsx — Smooth camera tweening to preset positions
 * Lives inside the R3F Canvas; uses useThree + useFrame for lerp.
 */
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const CAMERA_PRESETS = {
  front:   { position: [0, 1.0, 5.5],  label: 'Front' },
  side:    { position: [5.5, 1.0, 0],  label: 'Side' },
  top:     { position: [0, 6.0, 0.5],  label: 'Top' },
  quarter: { position: [4, 2, 4],      label: '3/4 View' },
}

const LERP_SPEED = 3.0

export default function CameraRig({ targetPreset }) {
  const { camera, controls } = useThree()
  const targetPos = useRef(new THREE.Vector3(4, 2, 5))
  const isAnimating = useRef(false)

  useEffect(() => {
    if (!targetPreset) return
    const preset = CAMERA_PRESETS[targetPreset]
    if (!preset) return

    targetPos.current.set(...preset.position)
    isAnimating.current = true

    // Pause auto-rotate during tween
    if (controls) controls.autoRotate = false
  }, [targetPreset, controls])

  useFrame((_, delta) => {
    if (!isAnimating.current) return

    const t = 1 - Math.exp(-LERP_SPEED * delta)
    camera.position.lerp(targetPos.current, t)

    // Check if close enough to stop
    if (camera.position.distanceTo(targetPos.current) < 0.02) {
      camera.position.copy(targetPos.current)
      isAnimating.current = false
      // Resume auto-rotate
      if (controls) controls.autoRotate = true
    }

    // Keep looking at center
    if (controls) controls.target.set(0, 0, 0)
    camera.updateProjectionMatrix()
  })

  return null
}
