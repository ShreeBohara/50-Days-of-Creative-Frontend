// A highlighter swipe over whatever printed entry the pointer is on: drawn
// with multiply blending, so it tints the ink and paper beneath exactly like a
// marker pen would, instead of covering them.

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rt } from '../state/store.js'
import { toWorld } from '../paper/kinematics.js'
import { makeRng } from '../art/rng.js'

function swipe() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 256, 64)
  const rng = makeRng(7)
  // a slightly ragged marker stroke, denser in the middle
  for (let i = 0; i < 260; i++) {
    const y = 10 + rng() * 44
    const x0 = 4 + rng() * 10
    const x1 = 246 - rng() * 10
    g.strokeStyle = `rgba(255,214,40,${(0.05 + rng() * 0.05).toFixed(3)})`
    g.lineWidth = 3 + rng() * 6
    g.beginPath()
    g.moveTo(x0, y)
    g.lineTo(x1, y + (rng() - 0.5) * 3)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const _m = new THREE.Matrix4()

export default function HoverMark() {
  const ref = useRef()
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: swipe(),
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.DstColorFactor,
        blendDst: THREE.ZeroFactor,
        toneMapped: false,
      }),
    [],
  )
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const h = rt.hover
    const pose = h?.type === 'spot' ? rt.view?.sheets[h.k]?.pose : null
    if (!pose) {
      m.visible = false
      return
    }
    const f = pose.frames.get(`page:${h.side}`)
    const [x, y, w, hh] = h.spot.rect
    const c = toWorld(f, x + w / 2, y + hh / 2)
    const lift = 0.03
    _m.set(
      f.ex[0] * w, f.ey[0] * hh, f.n[0], c[0] + f.n[0] * lift,
      f.ex[1] * w, f.ey[1] * hh, f.n[1], c[1] + f.n[1] * lift,
      f.ex[2] * w, f.ey[2] * hh, f.n[2], c[2] + f.n[2] * lift,
      0, 0, 0, 1,
    )
    m.matrix.copy(_m)
    m.matrixWorldNeedsUpdate = true
    m.visible = true
  })
  return (
    <mesh ref={ref} matrixAutoUpdate={false} visible={false} renderOrder={2} material={mat} userData={{ warm: true }}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
