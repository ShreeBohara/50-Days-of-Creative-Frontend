// The paper engineer's desk: a self-healing cutting mat under a warm lamp.
// The lamp sits high over the reader's left shoulder, so the printed faces of
// the pop-ups (which turn toward the reader) are lit, and each card throws
// its shadow back across the page behind it.

import { useMemo } from 'react'
import * as THREE from 'three'
import { BOARD } from './bookView.js'
import { makeRng } from '../art/rng.js'

const MAT_W = 104
const MAT_H = 72

/** A classic green cutting mat, drawn once: 1 cm grid, 5 cm majors, rulers, angles. */
function cuttingMat(res = 18) {
  const c = document.createElement('canvas')
  c.width = Math.round(MAT_W * res)
  c.height = Math.round(MAT_H * res)
  const g = c.getContext('2d')
  g.scale(res, res)
  g.fillStyle = '#21493f'
  g.fillRect(0, 0, MAT_W, MAT_H)
  // mottled wear
  const rng = makeRng(65)
  for (let i = 0; i < 900; i++) {
    const x = rng() * MAT_W
    const y = rng() * MAT_H
    g.fillStyle = `rgba(${rng() < 0.5 ? '255,255,255' : '0,0,0'},${(rng() * 0.025).toFixed(3)})`
    g.beginPath()
    g.arc(x, y, rng() * 3 + 0.5, 0, Math.PI * 2)
    g.fill()
  }
  const ox = 4
  const oy = 4
  g.lineCap = 'butt'
  for (let x = 0; x <= MAT_W - ox * 2; x++) {
    const major = x % 5 === 0
    g.strokeStyle = major ? 'rgba(206,232,214,0.42)' : 'rgba(170,210,190,0.18)'
    g.lineWidth = major ? 0.06 : 0.035
    g.beginPath()
    g.moveTo(ox + x, oy)
    g.lineTo(ox + x, MAT_H - oy)
    g.stroke()
  }
  for (let y = 0; y <= MAT_H - oy * 2; y++) {
    const major = y % 5 === 0
    g.strokeStyle = major ? 'rgba(206,232,214,0.42)' : 'rgba(170,210,190,0.18)'
    g.lineWidth = major ? 0.06 : 0.035
    g.beginPath()
    g.moveTo(ox, oy + y)
    g.lineTo(MAT_W - ox, oy + y)
    g.stroke()
  }
  // 45° and 60° guides from a corner
  g.strokeStyle = 'rgba(206,232,214,0.22)'
  g.lineWidth = 0.05
  for (const deg of [30, 45, 60]) {
    const t = (deg * Math.PI) / 180
    g.beginPath()
    g.moveTo(ox, MAT_H - oy)
    g.lineTo(ox + Math.cos(t) * 90, MAT_H - oy - Math.sin(t) * 90)
    g.stroke()
  }
  // rulers along the edges
  g.fillStyle = 'rgba(226,240,230,0.7)'
  g.font = '0.9px "Fragment Mono", monospace'
  g.textAlign = 'center'
  for (let x = 0; x <= MAT_W - ox * 2; x += 5) {
    g.fillText(String(x), ox + x, oy - 1.2)
    g.fillText(String(x), ox + x, MAT_H - oy + 2)
  }
  g.textAlign = 'right'
  for (let y = 5; y <= MAT_H - oy * 2; y += 5) g.fillText(String(y), ox - 0.8, oy + y + 0.3)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export default function Stage({ tier }) {
  const mat = useMemo(() => cuttingMat(tier === 'C' ? 11 : 18), [tier])
  const shadowSize = tier === 'C' ? 1024 : 2048
  return (
    <>
      <color attach="background" args={['#16211d']} />
      <fog attach="fog" args={['#16211d', 150, 260]} />
      <hemisphereLight args={['#fff4e2', '#2c4a3e', 0.9]} />
      <directionalLight
        position={[-26, 64, 30]}
        intensity={2.3}
        color="#ffe6c8"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={20}
        shadow-camera-far={150}
      />
      {/* a soft fill from the reader's side: cards turned away from the lamp
          still show their print, as under a studio softbox */}
      <directionalLight position={[8, 24, 62]} intensity={0.95} color="#fff8ee" />
      {/* a cool rim from behind on the right, so card edges separate from the page */}
      <directionalLight position={[30, 26, -40]} intensity={0.45} color="#d6e4ff" />
      <mesh rotation-x={-Math.PI / 2} position={[2, -BOARD - 0.02, 0]} receiveShadow>
        <planeGeometry args={[MAT_W, MAT_H]} />
        <meshStandardMaterial map={mat} roughness={0.78} metalness={0} />
      </mesh>
    </>
  )
}
