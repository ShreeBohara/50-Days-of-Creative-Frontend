import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ASSETS } from './assets.js'
import { bakedGeometry } from './geometry.js'
import { buildRibbonGeometry, makeSeamState } from './ribbons.js'
import { makeSeamMaterial } from './materials.js'
import { hairlineSeams, loadSeams } from './variants.js'
import { audio } from '../audio/engine.js'
import { formatColophon } from '../logic/colophon.js'
import { describe } from '../state/shelf.js'
import { rt, store, useStore } from '../state/store.js'

// Kept bowls stand in a row along the back of the tray at a third scale, each
// rebuilt from its share code: the intact glaze plus its variant's seams in
// burnished gold. Tap one and it rings (the duller tone of a mended bowl) and
// its colophon appears under the word.
const SCALE = 0.3
const Z = -0.118

function MiniBowl({ entry, index, geometry, material }) {
  const [gold, setGold] = useState(null)
  const d = useMemo(() => describe(entry), [entry])

  useEffect(() => {
    if (!d) return
    let alive = true
    loadSeams(d.variantId)
      .then(({ seams }) => {
        if (!alive) return
        const active = d.hairline ? hairlineSeams(seams) : seams.map((_, i) => i)
        const list = active.map((i) => seams[i])
        const { data, tex } = makeSeamState(list.length)
        list.forEach((s, i) => {
          data.set([0, s.length, 1, 1], i * 4)
        })
        tex.needsUpdate = true
        const mat = makeSeamMaterial(tex, list.length)
        mat.userData.uniforms.uWet.value = 0
        setGold({ geometry: buildRibbonGeometry(list), material: mat })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [d])

  if (!d) return null
  // left to right, clear of the gold jar; tighter on portrait screens
  const x = rt.portrait ? -0.105 + index * 0.042 : -0.172 + index * 0.055
  const yaw = index * 1.9 + 0.4
  const label = `${d.friend ? 'a bowl from a friend' : 'your bowl'} · ${formatColophon({
    pieces: d.pieces,
    goldMm: d.goldMm,
    date: d.date,
    hairline: d.hairline,
  })}`
  return (
    <group
      position={[x, 0, Z]}
      rotation={[0, yaw, 0]}
      scale={SCALE}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.nativeEvent.__kintsugiHit = true
        audio.unlock()
        audio.ring({ height01: 0.85, mended: true, position: e.point.toArray(), strength: 0.7 })
        store.set({ hint: label })
        clearTimeout(rt.shelfHintTimer)
        rt.shelfHintTimer = setTimeout(() => store.get().hint === label && store.set({ hint: null }), 4200)
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {gold ? <mesh geometry={gold.geometry} material={gold.material} renderOrder={3} /> : null}
    </group>
  )
}

export default function Shelf() {
  const shelf = useStore((s) => s.shelf)
  const gltf = useGLTF(ASSETS.bowl)
  const { geometry } = useMemo(() => bakedGeometry(gltf.scene)[0], [gltf])
  const material = useStore(() => rt.ceramic)
  const fallback = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efe6da', roughness: 0.4 }), [])
  if (!shelf?.length) return null
  return (
    <group>
      {shelf.map((entry, i) => (
        <MiniBowl key={entry.code} entry={entry} index={i} geometry={geometry} material={material ?? fallback} />
      ))}
    </group>
  )
}
