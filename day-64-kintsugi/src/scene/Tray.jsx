import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { ASSETS } from './assets.js'
import * as THREE from 'three'
import { rt } from '../state/store.js'

// The hinoki tray + tools from Blender. Physics sees the tray as a deep slab
// (top at y ≈ 0; the 1.5 mm dish is below perception) with a low wall on each
// side where the rolled rim is. The slab is 40 cm thick on purpose: a shard
// spawned slightly inside it must always be pushed UP, never out the bottom.
const W = 0.42
const D = 0.3
const RIM = 0.012
const WALL = 0.012

// metres to slide each tool toward the bowl on portrait screens
const PORTRAIT_SHIFT = {
  brush: [-0.075, 0, -0.012],
  burnisher: [0.1, 0, 0.005],
  jar: [-0.065, 0, -0.015],
}

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
      // only the tools answer the pointer; the 11k-triangle tray itself is
      // never picked, so it shouldn't be ray-tested on every move
      if (!toolOf(o)) o.raycast = () => {}
    })
    rt.tools = {
      brush: gltf.scene.getObjectByName('brush'),
      jar: gltf.scene.getObjectByName('jar'),
      lid: gltf.scene.getObjectByName('jar_lid'),
      burnisher: gltf.scene.getObjectByName('burnisher'),
      brushTip: gltf.scene.getObjectByName('brush_tip'),
      burnisherTip: gltf.scene.getObjectByName('burnisher_tip'),
    }
    // Portrait screens only see the middle of the tray, so the tools move in
    // close around the bowl (the brush and agate in front, the jar beside it).
    // The cached glTF survives "begin again", so the Blender pose is captured
    // once per node and every layout starts from it.
    for (const k of ['brush', 'jar', 'burnisher']) {
      const o = rt.tools[k]
      if (o) o.userData.home ??= { p: o.position.clone(), q: o.quaternion.clone() }
    }
    rt.toolHome = (k) => {
      const o = rt.tools?.[k]
      const h = o?.userData.home
      if (!h) return null
      const p = h.p.clone()
      if (rt.portrait) p.add(new THREE.Vector3(...PORTRAIT_SHIFT[k]))
      return { p, q: h.q }
    }
    const layout = () => {
      // below ~1.25:1 even the landscape framing clips the tray's ends
      rt.portrait = innerWidth / Math.max(1, innerHeight) < 1.25
      for (const k of ['brush', 'jar', 'burnisher']) {
        const o = rt.tools[k]
        if (!o || rt.craft?.tool === k) continue // in hand: leave it
        const h = rt.toolHome(k)
        o.position.copy(h.p)
        o.quaternion.copy(h.q)
      }
    }
    layout()
    window.addEventListener('resize', layout)
    return () => window.removeEventListener('resize', layout)
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
