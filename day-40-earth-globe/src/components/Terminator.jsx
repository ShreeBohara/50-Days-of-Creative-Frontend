import { useMemo } from 'react'
import * as THREE from 'three'
import { GLOBE_RADIUS } from './EarthGlobe'

const Z_AXIS = new THREE.Vector3(0, 0, 1)

export default function Terminator({ sunDirection }) {
  const quaternion = useMemo(() => {
    const target = new THREE.Vector3(sunDirection.x, sunDirection.y, sunDirection.z).normalize()
    return new THREE.Quaternion().setFromUnitVectors(Z_AXIS, target)
  }, [sunDirection])

  return (
    <group quaternion={quaternion}>
      <mesh>
        <torusGeometry args={[GLOBE_RADIUS * 1.012, 0.0035, 8, 220]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.42} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={[1.012, 1.012, 1]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.012, 0.0018, 8, 220]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.26} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
