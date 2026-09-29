import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ConvexHullCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { buildRibbonGeometry } from './ribbons.js'
import { makeCrackMaterial, makeFracture } from './materials.js'
import { hairlineSeams, loadVariant, prefetchIdle } from './variants.js'
import { audio } from '../audio/engine.js'
import { SEVERITY } from '../logic/severity.js'
import { VARIANT_IDS, variantId, zoneFromLocalPoint } from '../logic/impactZone.js'
import { maxImpactDist } from '../logic/seamGraph.js'
import { announce, dispatch, rt, store } from '../state/store.js'
import { CERAMIC_DENSITY } from './geometry.js'

const RACE_SECONDS = 0.45 // real time; the world is frozen while cracks run
const RAMP_SECONDS = 0.75 // then time eases back from 0.12× to 1×
const BEGIN_FIT_AFTER = 0.6 // s from the pieces settling to the mend
const TICK = 1 / 120 // the physics clock's fixed step (PhysicsClock.jsx)
const CLATTER_G = 3.5 // contact accelerations under ~3.5 g are resting weight, not a knock

function hash01(n) {
  const s = Math.sin(n * 91.345 + 17.1) * 43758.5453
  return s - Math.floor(s)
}

// The shards are mounted while the crack races (the world is frozen, so they
// hold the bowl's exact pose), hidden, with velocities already set. The burst
// then only swaps visibility and lets time run: no React mount, hull build or
// first upload lands on the frame the bowl comes apart.
function spawnFor(r) {
  const { info, data } = r
  const b = rt.bowl.body
  const t = b.translation()
  const q = b.rotation()
  const bowlPos = new THREE.Vector3(t.x, t.y, t.z)
  const bowlQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w)
  const items = data.shards.map((s) => {
    const pos = s.com.clone().applyQuaternion(bowlQuat).add(bowlPos)
    pos.y += 0.002 // clear of the tray by a hair so nothing starts inside it
    return { ...s, pos, quat: bowlQuat.clone() }
  })
  return { id: data.id, items, info, bowlPos, bowlQuat }
}

// Shards tell the ear when they land: contact force → impulse over one tick.
function clatter(payload, shard) {
  const body = payload.target.rigidBody
  if (!body) return
  const impulse = payload.totalForceMagnitude * TICK
  const t = body.translation()
  audio.clatter({ impulse, size: shard.size, position: [t.x, t.y, t.z] })
}

// The burst: the intact bowl leaves the world, the (already mounted) shards
// appear in its exact pose and fly outward from the impact.
function burst({ info, items }, { bodies, live, settle }) {
  rt.bowl.body.setEnabled(false)
  rt.bowl.mesh.visible = false
  live.current = true
  rt.shardMeshes?.forEach((m) => (m.visible = true))
  store.set({ pieces: items.length, placed: 0 })
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
    const kick = (0.18 + 0.55 * near) * speed * (fling ? 0.55 : 0.32) * (it.anchor ? 0.25 : 1) * (rt.reduced ? 0.4 : 1)
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
}

export default function Breakage() {
  const [spawn, setSpawn] = useState(null)
  const race = useRef(null)
  const settle = useRef(null)
  const bodies = useRef(new Map())
  const live = useRef(false) // shards shown (after the burst)
  const fracture = useMemo(() => makeFracture(), [])
  useEffect(() => () => fracture.dispose(), [fracture])

  // Once everything is on screen, parse every variant (drop sets first) in
  // idle time — but never while the bowl is in hand, the gesture that can
  // least afford a dropped frame. A break then never waits on the network.
  useEffect(() => {
    const start = () => {
      if (!store.get().loaded || rt.prefetched) return
      rt.prefetched = true
      const ids = [...VARIANT_IDS.filter((id) => id.endsWith('_drop')), ...VARIANT_IDS.filter((id) => id.endsWith('_fling'))]
      prefetchIdle(ids, () => store.get().phase === 'held')
    }
    start()
    return store.subscribe(start)
  }, [])

  useEffect(() => {
    rt.onBreak = async (info) => {
      if (!dispatch({ type: 'IMPACT', severity: info.severity })) return
      rt.clock.scale = 0 // the instant of impact, held
      audio.crack({ position: info.impactWorld.toArray(), severity: info.severity })
      try {
        if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(20)
      } catch {
        // no haptics here
      }
      const zone = zoneFromLocalPoint(info.impactLocal.toArray())
      const id = variantId(zone, info.severity)
      store.set({ variant: id })
      let data
      try {
        data = await loadVariant(id)
      } catch (err) {
        // a failed fetch mid-break (a fling on a flaky connection): fall back to
        // this zone's drop set, prefetched on the first lift — and if even that
        // is gone, undo the impact rather than hang in the frozen instant
        console.warn(err)
        try {
          data = await loadVariant(variantId(zone, SEVERITY.DROP))
          store.set({ variant: data.id })
        } catch (err2) {
          console.error(err2)
          rt.clock.scale = 1
          store.set({ phase: 'intact', severity: null, variant: null })
          announce('The bowl survived — the pieces could not be loaded.')
          return
        }
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
      const r = { t: 0, max: maxImpactDist(seams) + 0.002, crack, mat, info, data, hair }
      race.current = r
      if (!hair) {
        live.current = false
        r.spawn = spawnFor(r)
        setSpawn(r.spawn)
      }
    }
    return () => {
      rt.onBreak = null
    }
  }, [])

  useFrame((_, dt) => {
    const r = race.current
    if (r) {
      r.t += Math.min(dt, 1 / 30) // a slow frame mustn't make the crack front leap
      const k = Math.min(1, r.t / (rt.reduced ? 0.15 : RACE_SECONDS))
      const eased = 1 - Math.pow(1 - k, 2.2) // fast out of the impact, slowing at the tips
      r.mat.userData.uniforms.uFront.value = eased * r.max
      if (k >= 1) {
        race.current = null
        if (r.hair) {
          // Craft draws its own crack line over the unbroken bowl
          r.crack.removeFromParent()
          r.crack.geometry.dispose()
          r.mat.dispose()
          rt.clock.scale = 1
          const n = rt.activeSeams.length
          announce(`A hairline crack. ${n} seam${n === 1 ? '' : 's'} to mend.`)
          dispatch({ type: 'CRACK_DONE' })
          store.set({ pieces: 1 })
        } else if (bodies.current.size < r.spawn.items.length) {
          race.current = r // the shards are still mounting: hold the frozen instant a frame longer
        } else {
          r.crack.removeFromParent()
          r.crack.geometry.dispose()
          burst(r.spawn, { bodies, live, settle })
        }
      }
    }
    const s = settle.current
    if (s) {
      // the first frame after the burst has been drawn before time starts
      if (s.shown) s.t += Math.min(dt, 1 / 30)
      s.shown = true
      // slow motion eases back to real time on a smootherstep, not a lurch
      const k = Math.min(1, s.t / RAMP_SECONDS)
      rt.clock.scale = s.done ? 1 : 0.12 + 0.88 * k * k * k * (k * (6 * k - 15) + 10)
      let sleeping = 0
      bodies.current.forEach((b) => b && b.isSleeping() && sleeping++)
      const calm = sleeping === bodies.current.size || s.t > 2.6
      if (calm && !s.done) {
        s.done = true
        rt.clock.scale = 1
        dispatch({ type: 'CRACK_DONE' })
        announce(`The bowl broke into ${bodies.current.size} pieces.`)
        s.fitIn = BEGIN_FIT_AFTER
      }
      if (s.done) {
        // on the same clamped clock as everything else (not a wall-clock timer)
        s.fitIn -= Math.min(dt, 1 / 30)
        if (s.fitIn <= 0) {
          settle.current = null
          if (store.get().phase === 'broken') dispatch({ type: 'BEGIN_FIT' })
        }
      }
    }
  })

  // bodies register as they mount (during the frozen race)
  useEffect(() => {
    if (spawn) rt.shardBodies = bodies.current
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
          colliders={false}
          position={it.pos.toArray()}
          quaternion={it.quat.toArray()}
          linearDamping={0.3}
          angularDamping={0.6}
          ccd
          userData={{ shardId: it.id }}
          onContactForce={(p) => clatter(p, it)}
        >
          <ConvexHullCollider
            args={[it.hull]}
            density={CERAMIC_DENSITY}
            friction={0.62}
            restitution={0.14}
            contactForceEventThreshold={it.mass * 9.81 * CLATTER_G}
          />
          <mesh
            ref={(m) => {
              rt.shardMeshes ??= new Map()
              if (m) {
                m.visible = live.current
                rt.shardMeshes.set(it.id, m)
              } else rt.shardMeshes.delete(it.id)
            }}
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
