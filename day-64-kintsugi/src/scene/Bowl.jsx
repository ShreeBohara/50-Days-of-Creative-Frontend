import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { ConvexHullCollider, RigidBody, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { ASSETS } from './assets.js'
import { BOWL_MASS, BOWL_SLOT, bakedGeometry, shellMassProperties } from './geometry.js'
import { hullPoints } from './variants.js'
import { makeCeramic } from './materials.js'
import { BowlHold } from './bowlHold.js'
import { rt } from '../state/store.js'

// The burst hides the intact bowl but leaves it in the scene; hidden, it must
// not take pointer events (its hover would fight the mend's cursor).
function raycastWhenVisible(raycaster, hits) {
  if (this.visible) THREE.Mesh.prototype.raycast.call(this, raycaster, hits)
}

export default function Bowl() {
  const gltf = useGLTF(ASSETS.bowl)
  const body = useRef(null)
  const mesh = useRef(null)
  const { rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ctl = useMemo(() => new BowlHold(), [])

  // The collider is the hull of a few hundred support points, not of every
  // vertex: the full hull's foot is hundreds of coplanar points, and the
  // contact points Rapier picked among them flipped from tick to tick — a set
  // -down bowl rocked on its foot ring and never came to rest. Its mass sits
  // where the real shell's does (40 mm up, not the solid hull's 51 mm).
  const { geometry, material, hull, massProperties } = useMemo(() => {
    const [m] = bakedGeometry(gltf.scene)
    const pos = m.geometry.attributes.position.array
    return {
      geometry: m.geometry,
      material: makeCeramic(m.material),
      hull: hullPoints(pos),
      massProperties: shellMassProperties(pos, m.geometry.index?.array, BOWL_MASS),
    }
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
  // before the physics clock (-10): the kinematic target set here is the one
  // this frame's ticks move to, not next frame's
  useFrame((_, dt) => ctl.frame(dt), -20)

  return (
    <RigidBody
      ref={body}
      name="bowl"
      type="dynamic"
      colliders={false}
      position={BOWL_SLOT}
      ccd
      onCollisionEnter={({ other }) => ctl.onCollision(other)}
    >
      <ConvexHullCollider args={[hull]} massProperties={massProperties} friction={0.55} restitution={0.1} />
      <mesh
        ref={mesh}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        raycast={raycastWhenVisible}
        onPointerDown={(e) => ctl.onPointerDown(e)}
        onPointerOver={() => ctl.hover(true)}
        onPointerOut={() => ctl.hover(false)}
      />
    </RigidBody>
  )
}

useGLTF.preload(ASSETS.bowl)
