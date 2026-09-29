// Geometry helpers shared by the bowl, shards and seams.

import * as THREE from 'three'

// Where the bowl rests on the tray (Blender's slot_bowl, in three.js axes).
export const BOWL_SLOT = [-0.012, 0, -0.004]

// Hull colliders are solid, the bowl is a 5 mm shell: this density gives the
// intact bowl's hull its real ~0.32 kg (shards scale the same way).
export const CERAMIC_DENSITY = 420

// meshopt ships KHR_mesh_quantization: positions/normals/uvs arrive as
// normalised int16/int8 with the scale folded into the node transform. Physics
// (Rapier hulls read the raw array) and applyMatrix4 (clamps to [-1, 1]) both
// need plain floats, so expand every attribute first.
export function dequantize(geometry) {
  const g = geometry.clone()
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name]
    if (a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute) continue
    const out = new Float32Array(a.count * a.itemSize)
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k)
    }
    g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize))
  }
  return g
}

// Bake each packed mesh's node transform (quantisation moves it) into its
// geometry, so bowl-local space is exactly Blender's: origin at the centre of
// the foot's underside, +Y up, +Z toward the camera.
export function bakedGeometry(root) {
  const out = []
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    if (!o.isMesh) return
    const g = dequantize(o.geometry)
    g.applyMatrix4(o.matrixWorld)
    g.computeBoundingBox()
    g.computeBoundingSphere()
    out.push({ geometry: g, material: o.material, name: o.name, object: o })
  })
  return out
}
