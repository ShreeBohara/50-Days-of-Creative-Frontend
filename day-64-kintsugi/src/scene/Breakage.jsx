import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { buildRibbonGeometry } from './ribbons.js'
import { makeCrackMaterial, makeFracture } from './materials.js'
import { loadVariant, prefetch } from './variants.js'
import { audio } from '../audio/engine.js'
import { SEVERITY } from '../logic/severity.js'
import { VARIANT_IDS, variantId, zoneFromLocalPoint } from '../logic/impactZone.js'
import { maxImpactDist } from '../logic/seamGraph.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { CERAMIC_DENSITY } from './geometry.js'

const RACE_SECONDS = 0.45 // real time; the world is frozen while cracks run
const RAMP_SECONDS = 0.55 // then time eases back from 0.25× to 1×
const HAIRLINE_SEAMS = 3

function hash01(n) {
  const s = Math.sin(n * 91.345 + 17.1) * 43758.5453
  return s - Math.floor(s)
}

/** The seams a hairline crack uses: the few that start nearest the impact. */
function hairlineSeams(seams) {
  return seams
    .map((s, i) => ({ i, d: Math.min(...s.impactDist) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, HAIRLINE_SEAMS)
    .map((x) => x.i)
}

function splitBowl(r, setSpawn) {
  const { info, data } = r
  const b = rt.bowl.body
  const t = b.translation()
  const q = b.rotation()
  const bowlPos = new THREE.Vector3(t.x, t.y, t.z)
  const bowlQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w)
  // the intact bowl leaves the world; its shards take its exact pose
  b.setEnabled(false)
  rt.bowl.mesh.visible = false
  const items = data.shards.map((s) => {
    const pos = s.com.clone().applyQuaternion(bowlQuat).add(bowlPos)
    pos.y += 0.002 // clear of the tray by a hair so nothing starts inside it
    return { ...s, pos, quat: bowlQuat.clone() }
  })
  store.set({ pieces: items.length, placed: 0 })
  setSpawn({ id: data.id, items, info, bowlPos, bowlQuat })
}


export default function Breakage() {
  const [spawn, setSpawn] = useState(null)
  const race = useRef(null)
  const settle = useRef(null)
  const bodies = useRef(new Map())
  const fracture = useMemo(() => makeFracture(), [])

  // Warm the cache with the six drop variants once the bowl is first lifted;
  // fling sets (a hard throw) load on demand while the moment of impact holds.
  useEffect(
    () =>
      store.subscribe(() => {
        if (store.get().phase === 'held' && !rt.prefetched) {
          rt.prefetched = true
          prefetch(VARIANT_IDS.filter((id) => id.endsWith('_drop')))
        }
      }),
    [],
  )

  useEffect(() => {
    rt.onBreak = async (info) => {
      if (!dispatch({ type: 'IMPACT', severity: info.severity })) return
      rt.clock.scale = 0 // the instant of impact, held
      audio.crack({ position: info.impactWorld.toArray(), severity: info.severity })
      const zone = zoneFromLocalPoint(info.impactLocal.toArray())
      const id = variantId(zone, info.severity)
      store.set({ variant: id })
      let data
      try {
        data = await loadVariant(id)
      } catch (err) {
        console.error(err)
        rt.clock.scale = 1
        return
      }
      rt.variant = data
      const hair = info.severity === SEVERITY.HAIRLINE
      const active = hair ? hairlineSeams(data.seams) : data.seams.map((_, i) => i)
      rt.activeSeams = active
      const seams = active.map((i) => data.seams[i])
      const geo = buildRibbonGeometry(seams)
      const mat = makeCrackMaterial()
      const crack = new THREE.Mesh(geo, mat)
      crack.renderOrder = 2
      rt.bowl.mesh.add(crack)
      race.current = { t: 0, max: maxImpactDist(seams) + 0.002, crack, mat, info, data, hair }
    }
    return () => {
      rt.onBreak = null
    }
  }, [])

  useFrame((_, dt) => {
    const r = race.current
    if (r) {
      r.t += dt
      const k = Math.min(1, r.t / RACE_SECONDS)
      const eased = 1 - Math.pow(1 - k, 2.2) // fast out of the impact, slowing at the tips
      r.mat.userData.uniforms.uFront.value = eased * r.max
      if (k >= 1) {
        race.current = null
        if (r.hair) {
          rt.clock.scale = 1
          const n = rt.activeSeams.length
          announce(`A hairline crack. ${n} seam${n === 1 ? '' : 's'} to mend.`)
          dispatch({ type: 'CRACK_DONE' })
          store.set({ pieces: 1 })
        } else {
          r.crack.removeFromParent()
          r.crack.geometry.dispose()
          splitBowl(r, setSpawn)
        }
      }
    }
    const s = settle.current
    if (s) {
      s.t += dt
      rt.clock.scale = Math.min(1, 0.25 + 0.75 * Math.min(1, s.t / RAMP_SECONDS) ** 2)
      let sleeping = 0
      bodies.current.forEach((b) => b && b.isSleeping() && sleeping++)
      const calm = sleeping === bodies.current.size || s.t > 2.6
      if (calm && !s.done) {
        s.done = true
        rt.clock.scale = 1
        dispatch({ type: 'CRACK_DONE' })
        announce(`The bowl broke into ${bodies.current.size} pieces.`)
        setTimeout(() => {
          if (store.get().phase === 'broken') dispatch({ type: 'BEGIN_FIT' })
        }, 1200)
        settle.current = null
      }
    }
  })

  // Once the shard bodies exist, send them outward from the impact.
  useEffect(() => {
    if (!spawn) return
    const { info, items } = spawn
    const fling = info.severity === SEVERITY.FLING
    const speed = info.impactSpeed
    const imp = info.impactWorld
    const dir = new THREE.Vector3()
    for (const it of items) {
      const body = bodies.current.get(it.id)
      if (!body) continue
      dir.subVectors(it.pos, imp)
      const d = dir.length()
      dir.y = Math.max(dir.y, 0) * 0.4 + 0.35
      dir.normalize()
      const near = Math.exp(-d / 0.05) // pieces at the impact fly furthest
      const kick = (0.18 + 0.55 * near) * speed * (fling ? 0.55 : 0.32) * (it.anchor ? 0.25 : 1)
      body.setLinvel(
        {
          x: info.velocity.x * 0.12 + dir.x * kick,
          y: Math.abs(info.velocity.y) * 0.08 + dir.y * kick,
          z: info.velocity.z * 0.12 + dir.z * kick,
        },
        true,
      )
      const h = hash01(it.id + 3)
      body.setAngvel({ x: (h - 0.5) * 9 * near, y: (hash01(it.id) - 0.5) * 6, z: (hash01(it.id + 9) - 0.5) * 9 * near }, true)
    }
    settle.current = { t: 0 }
    rt.shardBodies = bodies.current
  }, [spawn])

  if (!spawn) return null
  const materials = [rt.ceramic, fracture]
  return (
    <group>
      {spawn.items.map((it) => (
        <RigidBody
          key={`${spawn.id}-${it.id}`}
          ref={(api) => {
            if (api) bodies.current.set(it.id, api)
            else bodies.current.delete(it.id)
          }}
          name={`shard-${it.id}`}
          type="dynamic"
          colliders="hull"
          position={it.pos.toArray()}
          quaternion={it.quat.toArray()}
          density={CERAMIC_DENSITY}
          friction={0.62}
          restitution={0.14}
          linearDamping={0.3}
          angularDamping={0.6}
          ccd
          userData={{ shardId: it.id }}
        >
          <mesh
            geometry={it.geometry}
            material={materials}
            castShadow
            receiveShadow
            userData={{ shardId: it.id }}
            onPointerDown={(e) => {
              e.nativeEvent.__kintsugiHit = true
              rt.fit?.onShardDown(e, it.id)
            }}
            onPointerOver={() => rt.fit?.hover(it.id, true)}
            onPointerOut={() => rt.fit?.hover(it.id, false)}
          />
        </RigidBody>
      ))}
    </group>
  )
}
