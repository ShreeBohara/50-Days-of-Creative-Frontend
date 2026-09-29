import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { ASSETS } from './assets.js'
import { rt } from '../state/store.js'

// The hinoki tray + tools from Blender. Physics sees the tray as a deep slab
// (top at y ≈ 0; the 1.5 mm dish is below perception) with a low wall on each
// side where the rolled rim is. The slab is 40 cm thick on purpose: a shard
// spawned slightly inside it must always be pushed UP, never out the bottom.
const W = 0.42
const D = 0.3
const RIM = 0.012
const WALL = 0.012

function toolOf(o) {
  for (let n = o; n; n = n.parent) {
    if (n.name === 'brush' || n.name === 'jar' || n.name === 'burnisher') return n.name
  }
  return null
}

export default function Tray() {
  const gltf = useGLTF(ASSETS.trayTools)

  useEffect(() => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = o.name !== 'tray' && o.parent?.name !== 'tray'
      o.receiveShadow = true
      if (o.material) {
        o.material.envMapIntensity = 0.9
        if (o.material.map) o.material.map.anisotropy = 8
      }
    })
    rt.tools = {
      brush: gltf.scene.getObjectByName('brush'),
      jar: gltf.scene.getObjectByName('jar'),
      lid: gltf.scene.getObjectByName('jar_lid'),
      burnisher: gltf.scene.getObjectByName('burnisher'),
      brushTip: gltf.scene.getObjectByName('brush_tip'),
      burnisherTip: gltf.scene.getObjectByName('burnisher_tip'),
    }
  }, [gltf])

  return (
    <>
      <primitive
        object={gltf.scene}
        onPointerDown={(e) => {
          const name = toolOf(e.object)
          if (!name || !rt.craft?.stage) return
          e.stopPropagation()
          e.nativeEvent.__kintsugiHit = true
          rt.craft.pickTool(name)
        }}
        onPointerOver={(e) => {
          const name = toolOf(e.object)
          if (name && rt.craft?.stage && !rt.craft.tool) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      />
      <RigidBody name="tray" type="fixed" colliders={false} friction={0.7} restitution={0.12}>
        <CuboidCollider args={[W / 2 + 0.2, 0.2, D / 2 + 0.2]} position={[0, -0.2 - 0.0012, 0]} />
        <CuboidCollider args={[WALL / 2, RIM, D / 2]} position={[W / 2 - WALL / 2, 0, 0]} />
        <CuboidCollider args={[WALL / 2, RIM, D / 2]} position={[-W / 2 + WALL / 2, 0, 0]} />
        <CuboidCollider args={[W / 2, RIM, WALL / 2]} position={[0, 0, D / 2 - WALL / 2]} />
        <CuboidCollider args={[W / 2, RIM, WALL / 2]} position={[0, 0, -D / 2 + WALL / 2]} />
      </RigidBody>
    </>
  )
}

useGLTF.preload(ASSETS.trayTools)
