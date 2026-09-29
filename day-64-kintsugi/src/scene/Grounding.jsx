import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rt, store } from '../state/store.js'

// A soft contact shadow under the bowl (or the mended assembly): the cheap
// stand-in for screen-space AO. It tightens and darkens as the bowl nears the
// tray and fades away as it's lifted — the cue that sells weight.
function blobTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(10,6,4,0.95)')
  grad.addColorStop(0.45, 'rgba(10,6,4,0.55)')
  grad.addColorStop(1, 'rgba(10,6,4,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const _p = new THREE.Vector3()

export default function Grounding() {
  const mesh = useRef(null)
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0 }),
    [],
  )
  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const phase = store.get().phase
    let y = null
    if ((phase === 'veiled' || phase === 'intact' || phase === 'held' || phase === 'cracking') && rt.bowl?.body?.isEnabled()) {
      const t = rt.bowl.body.translation()
      _p.set(t.x, 0, t.z)
      y = t.y
    } else if (rt.fit?.riding && rt.assembly) {
      _p.set(rt.assembly.position.x, 0, rt.assembly.position.z)
      y = rt.assembly.position.y
    }
    if (y == null) {
      m.visible = false
      return
    }
    const lift = THREE.MathUtils.clamp(y / 0.22, 0, 1)
    m.visible = true
    m.position.set(_p.x, 0.0009, _p.z)
    const s = 0.15 * (1 + lift * 0.9)
    m.scale.set(s, s, 1)
    m.material.opacity = 0.62 * (1 - lift) ** 1.6
  })
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} material={material} renderOrder={1} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
