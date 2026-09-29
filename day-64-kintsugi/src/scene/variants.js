// Loads a pre-fractured variant (GLB + seam JSON) and turns it into
// physics-ready shards: one merged geometry per shard (glaze + clay groups),
// recentred on its centre of mass so rigid bodies pivot correctly, with the
// "home" pose (identity rotation, COM offset) recorded in bowl-local space.

import * as THREE from 'three'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ASSETS } from './assets.js'
import { dequantize } from './geometry.js'
import { prepareSeams } from '../logic/seamGraph.js'

const STONEWARE_G_PER_CM3 = 2.3

// the same loader + meshopt decoder drei's useGLTF uses, so only one ships
const loader = new GLTFLoader()
loader.setMeshoptDecoder(typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder)

const cache = new Map()

// Convex-hull input for a shard: the vertex furthest along each of 400 evenly
// spread directions (within ~0.6 mm of the true hull on the real shards).
// Rapier then hulls ≤ ~200 points instead of every vertex (the foot shard has
// ~8,000), which is what used to stall the burst frame.
const HULL_DIRS = (() => {
  const n = 400
  // the six axes exactly (a shard lying flat keeps its full height), then a
  // Fibonacci sphere
  const out = new Float32Array((n + 6) * 3)
  out.set([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1])
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out.set([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r], (i + 6) * 3)
  }
  return out
})()

export function hullPoints(positions) {
  const count = positions.length / 3
  const picked = new Set()
  for (let d = 0; d < HULL_DIRS.length; d += 3) {
    const dx = HULL_DIRS[d]
    const dy = HULL_DIRS[d + 1]
    const dz = HULL_DIRS[d + 2]
    let best = -Infinity
    let bi = 0
    for (let i = 0, j = 0; i < count; i++, j += 3) {
      const v = positions[j] * dx + positions[j + 1] * dy + positions[j + 2] * dz
      if (v > best) {
        best = v
        bi = i
      }
    }
    picked.add(bi)
  }
  const out = new Float32Array(picked.size * 3)
  let k = 0
  for (const i of picked) {
    out[k++] = positions[i * 3]
    out[k++] = positions[i * 3 + 1]
    out[k++] = positions[i * 3 + 2]
  }
  return out
}

function buildShards(gltf, json) {
  const byName = new Map()
  gltf.scene.updateWorldMatrix(true, true)
  // top-level nodes are shards; primitives come in as child meshes
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return
    let n = o
    while (n.parent && n.parent !== gltf.scene) n = n.parent
    const m = /^shard_(\d+)/.exec(n.name)
    if (!m) return
    const id = Number(m[1])
    if (!byName.has(id)) byName.set(id, [])
    const g = dequantize(o.geometry)
    g.applyMatrix4(o.matrixWorld)
    byName.get(id).push({ g, slot: o.material?.name === 'fracture' ? 1 : 0 })
  })
  return json.shards.map((s) => {
    const parts = (byName.get(s.id) || []).sort((a, b) => a.slot - b.slot)
    for (const p of parts) {
      for (const k of Object.keys(p.g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(k)) p.g.deleteAttribute(k)
      }
      if (!p.g.index) {
        const n = p.g.attributes.position.count
        const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n)
        for (let i = 0; i < n; i++) idx[i] = i
        p.g.setIndex(new THREE.BufferAttribute(idx, 1))
      }
    }
    const geometry = mergeGeometries(
      parts.map((p) => p.g),
      true,
    )
    // groups follow part order; make sure material indices match slots
    geometry.groups.forEach((gr, i) => (gr.materialIndex = parts[i].slot))
    const com = new THREE.Vector3().fromArray(s.com)
    geometry.translate(-com.x, -com.y, -com.z)
    geometry.computeBoundingSphere()
    return {
      hull: null, // filled in by finishShards, one shard per task
      size: geometry.boundingSphere.radius * 2,
      id: s.id,
      anchor: s.anchor,
      neighbors: s.neighbors,
      com,
      mass: Math.max(0.004, (s.volumeCm3 * STONEWARE_G_PER_CM3) / 1000),
      geometry,
    }
  })
}

// Hull points and the pointer's bounds tree cost a few ms per shard: do them
// one shard per task, so the renderer gets a frame in between.
const yieldTask = () => new Promise((r) => setTimeout(r, 0))
async function finishShards(shards) {
  for (const s of shards) {
    await yieldTask()
    s.hull = hullPoints(s.geometry.attributes.position.array)
    s.geometry.computeBoundsTree?.()
  }
  return shards
}

const seamCache = new Map()

/** Promise<{ json, seams }> — just the crack graph (the shelf needs no shards). */
export function loadSeams(id) {
  if (!seamCache.has(id)) {
    const p = fetch(ASSETS.seams(id))
      .then((r) => {
        if (!r.ok) throw new Error(`seams ${id}: ${r.status}`)
        return r.json()
      })
      .then((json) => ({ json, seams: prepareSeams(json) }))
    p.catch(() => seamCache.delete(id))
    seamCache.set(id, p)
  }
  return seamCache.get(id)
}

/** Promise<{ id, json, seams, shards }> — cached per variant id. */
export function loadVariant(id) {
  if (!cache.has(id)) {
    const p = Promise.all([loadSeams(id), loader.loadAsync(ASSETS.fracture(id))]).then(async ([{ json, seams }, gltf]) => ({
      id,
      json,
      seams,
      shards: await finishShards(buildShards(gltf, json)),
    }))
    p.catch(() => cache.delete(id)) // let a later attempt retry
    cache.set(id, p)
  }
  return cache.get(id)
}

/** The seams a hairline crack uses: the few that start nearest the impact. */
export function hairlineSeams(seams, count = 3) {
  return seams
    .map((s, i) => ({ i, d: Math.min(...s.impactDist) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.i)
}

export function prefetch(ids) {
  for (const id of ids) loadVariant(id).catch(() => {})
}

/**
 * Load variants one at a time in idle slots, so parsing never lands on a
 * frame that is also answering a drag. `busy()` postpones the next one.
 */
export function prefetchIdle(ids, busy = () => false) {
  const queue = ids.filter((id) => !cache.has(id))
  const idle = (fn) =>
    typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 120)
  const next = () => {
    if (!queue.length) return
    if (busy()) {
      setTimeout(() => idle(next), 400)
      return
    }
    loadVariant(queue.shift())
      .catch(() => {})
      .finally(() => idle(next))
  }
  idle(next)
}
