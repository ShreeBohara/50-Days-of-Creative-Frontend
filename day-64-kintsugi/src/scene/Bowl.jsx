import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { ASSETS } from './assets.js'
import { BOWL_SLOT, bakedGeometry } from './geometry.js'
import { makeCeramic } from './materials.js'

export default function Bowl() {
  const gltf = useGLTF(ASSETS.bowl)
  const { geometry, material } = useMemo(() => {
    const [m] = bakedGeometry(gltf.scene)
    return { geometry: m.geometry, material: makeCeramic(m.material) }
  }, [gltf])

  return (
    <RigidBody type="dynamic" colliders="hull" position={BOWL_SLOT} mass={0.32} friction={0.55} restitution={0.08}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
    </RigidBody>
  )
}

useGLTF.preload(ASSETS.bowl)
