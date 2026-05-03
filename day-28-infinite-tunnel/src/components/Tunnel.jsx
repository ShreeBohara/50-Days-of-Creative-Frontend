import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useFlightCamera from '../hooks/useFlightCamera'
import tunnelVert from '../shaders/tunnel.vert'
import tunnelFrag from '../shaders/tunnel.frag'

/**
 * Tunnel configuration constants.
 */
const TUNNEL_LENGTH = 200
const TUNNEL_SEGMENTS = 512
const TUNNEL_RADIUS = 3
const TUNNEL_RADIAL_SEGMENTS = 64
const CURVE_POINTS = 80

/**
 * Tunnel — Procedural tube geometry with custom GLSL shader material.
 * Cross-section morphs between shapes. Camera flies through the inside.
 */
export default function Tunnel() {
  const meshRef = useRef()

  /* Generate a sinuous spline path for the tunnel */
  const { curve, geometry } = useMemo(() => {
    const points = []
    for (let i = 0; i < CURVE_POINTS; i++) {
      const t = i / (CURVE_POINTS - 1)
      const z = -t * TUNNEL_LENGTH
      const x = Math.sin(t * Math.PI * 4) * 2.5
      const y = Math.cos(t * Math.PI * 3) * 1.8
      points.push(new THREE.Vector3(x, y, z))
    }

    const c = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)

    const geo = new THREE.TubeGeometry(
      c,
      TUNNEL_SEGMENTS,
      TUNNEL_RADIUS,
      TUNNEL_RADIAL_SEGMENTS,
      false,
    )

    return { curve: c, geometry: geo }
  }, [])

  /* Custom shader material uniforms — shared between vertex & fragment */
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_speed: { value: 1.0 },
      u_mouseInfluence: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  )

  /* Animate uniforms every frame */
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.u_time.value = state.clock.elapsedTime
    }
  })

  /* Fly the camera through the tunnel */
  useFlightCamera(curve, { baseSpeed: 0.0004, meshRef })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={tunnelVert}
        fragmentShader={tunnelFrag}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={false}
      />
    </mesh>
  )
}

export { TUNNEL_LENGTH, TUNNEL_SEGMENTS, TUNNEL_RADIUS, CURVE_POINTS }
