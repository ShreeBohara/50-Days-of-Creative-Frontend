import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { RigidBody, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { ASSETS } from './assets.js'
import { BOWL_SLOT, CERAMIC_DENSITY, bakedGeometry } from './geometry.js'
import { makeCeramic } from './materials.js'
import { BowlHold } from './bowlHold.js'
import { rt } from '../state/store.js'

export default function Bowl() {
  const gltf = useGLTF(ASSETS.bowl)
  const body = useRef(null)
  const mesh = useRef(null)
  const { rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ctl = useMemo(() => new BowlHold(), [])

  const { geometry, material } = useMemo(() => {
    const [m] = bakedGeometry(gltf.scene)
    return { geometry: m.geometry, material: makeCeramic(m.material) }
  }, [gltf])

  useEffect(() => {
    ctl.bind({ body: body.current, mesh: mesh.current, rapier, camera, canvas: gl.domElement })
    rt.bowl = { body: body.current, mesh: mesh.current, material, hold: ctl }
    rt.ceramic = material
    return () => {
      rt.bowl = null
      material.dispose() // a fresh glaze material is made per run
    }
  }, [ctl, rapier, camera, gl, material])

  // velocity just before each step — collision events arrive after the step
  // that already resolved the bounce, so this is the true impact speed
  useBeforePhysicsStep(() => ctl.sampleVelocity())
  useFrame((_, dt) => ctl.frame(dt))

  return (
    <RigidBody
      ref={body}
      name="bowl"
      type="dynamic"
      colliders="hull"
      position={BOWL_SLOT}
      density={CERAMIC_DENSITY}
      friction={0.55}
      restitution={0.1}
      ccd
      onCollisionEnter={({ other }) => ctl.onCollision(other)}
    >
      <mesh
        ref={mesh}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onPointerDown={(e) => ctl.onPointerDown(e)}
        onPointerOver={() => ctl.hover(true)}
        onPointerOut={() => ctl.hover(false)}
      />
    </RigidBody>
  )
}

useGLTF.preload(ASSETS.bowl)
