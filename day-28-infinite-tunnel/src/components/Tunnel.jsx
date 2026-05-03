import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Total length of the tunnel spline.
 * We build one long tube and loop the camera seamlessly.
 */
const TUNNEL_LENGTH = 200
const TUNNEL_SEGMENTS = 512
const TUNNEL_RADIUS = 3
const TUNNEL_RADIAL_SEGMENTS = 64
const CURVE_POINTS = 80

/**
 * Tunnel — Procedural tube geometry following a wavy CatmullRom spline.
 * The camera sits inside, so the mesh uses BackSide rendering.
 */
export default function Tunnel() {
  const meshRef = useRef()

  /* Generate a sinuous spline path for the tunnel */
  const { curve, geometry } = useMemo(() => {
    const points = []
    for (let i = 0; i < CURVE_POINTS; i++) {
      const t = i / (CURVE_POINTS - 1)
      const z = -t * TUNNEL_LENGTH
      /* Gentle sinusoidal sway so the tunnel isn't a boring straight pipe */
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

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#7c3aed"
        side={THREE.BackSide}
        emissive="#3b0764"
        emissiveIntensity={0.3}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  )
}

/* Export constants so other components can reuse */
export { TUNNEL_LENGTH, TUNNEL_SEGMENTS, TUNNEL_RADIUS, CURVE_POINTS }
