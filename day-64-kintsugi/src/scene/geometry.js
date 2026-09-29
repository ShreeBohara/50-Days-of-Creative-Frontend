// Geometry helpers shared by the bowl, shards and seams.

import * as THREE from 'three'

// Where the bowl rests on the tray (Blender's slot_bowl, in three.js axes).
export const BOWL_SLOT = [-0.012, 0, -0.004]

// Hull colliders are solid, the bowl is a 5 mm shell: this density gives the
// intact bowl's hull its real ~0.32 kg (shards scale the same way).
export const CERAMIC_DENSITY = 420
export const BOWL_MASS = 0.318 // kg — what that hull used to weigh; the impact tuning assumes it

/**
 * Mass properties of a closed (watertight) triangle mesh treated as solid
 * material — here the 5 mm ceramic shell itself, not its convex hull, whose
 * centre of mass would sit 11 mm too high. Signed tetrahedra from the origin;
 * inertia about the centre of mass, scaled to `mass`. The bowl is close to
 * axisymmetric, so the diagonal is taken as the principal inertia.
 */
export function shellMassProperties(positions, index, mass) {
  let V = 0
  let cx = 0
  let cy = 0
  let cz = 0
  // second moments ∫x², ∫y², ∫z² (per unit density)
  let xx = 0
  let yy = 0
  let zz = 0
  const n = index ? index.length : positions.length / 3
  const at = (k) => (index ? index[k] : k) * 3
  for (let t = 0; t < n; t += 3) {
    const a = at(t)
    const b = at(t + 1)
    const c = at(t + 2)
    const [ax, ay, az] = [positions[a], positions[a + 1], positions[a + 2]]
    const [bx, by, bz] = [positions[b], positions[b + 1], positions[b + 2]]
    const [qx, qy, qz] = [positions[c], positions[c + 1], positions[c + 2]]
    const v = (ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx)) / 6
    V += v
    cx += (v * (ax + bx + qx)) / 4
    cy += (v * (ay + by + qy)) / 4
    cz += (v * (az + bz + qz)) / 4
    const sx = ax + bx + qx
    const sy = ay + by + qy
    const sz = az + bz + qz
    xx += ((ax * ax + bx * bx + qx * qx + sx * sx) * v) / 20
    yy += ((ay * ay + by * by + qy * qy + sy * sy) * v) / 20
    zz += ((az * az + bz * bz + qz * qz + sz * sz) * v) / 20
  }
  const com = { x: cx / V, y: cy / V, z: cz / V }
  const rho = mass / V
  // about the centre of mass (parallel axis)
  const Sxx = xx * rho - mass * com.x * com.x
  const Syy = yy * rho - mass * com.y * com.y
  const Szz = zz * rho - mass * com.z * com.z
  return {
    mass,
    centerOfMass: com,
    principalAngularInertia: { x: Syy + Szz, y: Sxx + Szz, z: Sxx + Syy },
    angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
  }
}

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
