// Loads a pre-fractured variant (GLB + seam JSON) and turns it into
// physics-ready shards: one merged geometry per shard (glaze + clay groups),
// recentred on its centre of mass so rigid bodies pivot correctly, with the
// "home" pose (identity rotation, COM offset) recorded in bowl-local space.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ASSETS } from './assets.js'
import { dequantize } from './geometry.js'
import { prepareSeams } from '../logic/seamGraph.js'

const STONEWARE_G_PER_CM3 = 2.3

const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)

const cache = new Map()

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
      if (!p.g.index) p.g.setIndex([...Array(p.g.attributes.position.count).keys()])
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
      id: s.id,
      anchor: s.anchor,
      neighbors: s.neighbors,
      com,
      mass: Math.max(0.004, (s.volumeCm3 * STONEWARE_G_PER_CM3) / 1000),
      geometry,
    }
  })
}

/** Promise<{ id, json, seams, shards }> — cached per variant id. */
export function loadVariant(id) {
  if (!cache.has(id)) {
    const p = Promise.all([
      fetch(ASSETS.seams(id)).then((r) => {
        if (!r.ok) throw new Error(`seams ${id}: ${r.status}`)
        return r.json()
      }),
      loader.loadAsync(ASSETS.fracture(id)),
    ]).then(([json, gltf]) => ({ id, json, seams: prepareSeams(json), shards: buildShards(gltf, json) }))
    p.catch(() => cache.delete(id)) // let a later attempt retry
    cache.set(id, p)
  }
  return cache.get(id)
}

export function prefetch(ids) {
  for (const id of ids) loadVariant(id).catch(() => {})
}
