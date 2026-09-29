// Build one BufferGeometry holding every crack as a thin ribbon. Vertices sit
// ON the crack centre line; each carries a sideways offset (the surface
// binormal × ±1) that the shader scales by the current line width, so the
// same geometry serves the hairline crack race and the fat gold seam.

import * as THREE from 'three'

function hash(x) {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// smooth 1D value noise, 0..1 — real kintsugi lines swell and thin by hand
function vnoise(x) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

/**
 * @param seams prepared seams from seamGraph.prepareSeams (pos/nrm/arclen/impactDist)
 */
export function buildRibbonGeometry(seams) {
  let verts = 0
  let tris = 0
  for (const s of seams) {
    if (s.n < 2) continue
    verts += s.n * 2
    tris += (s.n - 1) * 2
  }
  const position = new Float32Array(verts * 3)
  const normal = new Float32Array(verts * 3)
  const offset = new Float32Array(verts * 3)
  const seamIdx = new Float32Array(verts)
  const arc = new Float32Array(verts)
  const impact = new Float32Array(verts)
  const taper = new Float32Array(verts)
  const uv = new Float32Array(verts * 2)
  const index = new Uint32Array(tris * 3)

  const t = new THREE.Vector3()
  const nrm = new THREE.Vector3()
  const b = new THREE.Vector3()
  const a = new THREE.Vector3()
  const c = new THREE.Vector3()

  let v = 0
  let k = 0
  seams.forEach((s, si) => {
    if (s.n < 2) return
    const base = v
    for (let i = 0; i < s.n; i++) {
      const i0 = Math.max(0, i - 1)
      const i1 = Math.min(s.n - 1, i + 1)
      a.fromArray(s.pos, i0 * 3)
      c.fromArray(s.pos, i1 * 3)
      t.subVectors(c, a)
      if (t.lengthSq() < 1e-14) t.set(1, 0, 0)
      t.normalize()
      // a 5-tap average along the seam: where a crack folds over the rim the
      // normal swings 180° in a few millimetres, and an unsmoothed ribbon twists
      nrm.set(0, 0, 0)
      for (let o = -2; o <= 2; o++) {
        const j = Math.min(s.n - 1, Math.max(0, i + o))
        nrm.x += s.nrm[j * 3] * (o === 0 ? 2 : 1)
        nrm.y += s.nrm[j * 3 + 1] * (o === 0 ? 2 : 1)
        nrm.z += s.nrm[j * 3 + 2] * (o === 0 ? 2 : 1)
      }
      if (nrm.lengthSq() < 1e-12) nrm.fromArray(s.nrm, i * 3)
      if (nrm.lengthSq() < 1e-12) nrm.set(0, 1, 0)
      nrm.normalize()
      b.crossVectors(t, nrm)
      if (b.lengthSq() < 1e-12) b.set(0, 1, 0)
      b.normalize()
      const s0 = s.arclen[i]
      const end = Math.min(s0, s.length - s0)
      const tp = (0.35 + 0.65 * Math.min(1, end / 0.0022)) * (0.78 + 0.44 * vnoise(s0 * 260 + si * 13.1))
      for (const side of [-1, 1]) {
        position.set(s.pos.subarray(i * 3, i * 3 + 3), v * 3)
        normal[v * 3] = nrm.x
        normal[v * 3 + 1] = nrm.y
        normal[v * 3 + 2] = nrm.z
        offset[v * 3] = b.x * side
        offset[v * 3 + 1] = b.y * side
        offset[v * 3 + 2] = b.z * side
        seamIdx[v] = si
        arc[v] = s0
        impact[v] = s.impactDist[i]
        taper[v] = tp
        uv[v * 2] = s0 * 40
        uv[v * 2 + 1] = side > 0 ? 1 : 0
        v++
      }
    }
    // wound so the face normal is +N (B × T = N with B = T × N): front faces
    // point out of the glaze, toward anyone looking at the seam
    for (let i = 0; i < s.n - 1; i++) {
      const p = base + i * 2
      index[k++] = p
      index[k++] = p + 1
      index[k++] = p + 2
      index[k++] = p + 1
      index[k++] = p + 3
      index[k++] = p + 2
    }
  })

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('aOffset', new THREE.BufferAttribute(offset, 3))
  g.setAttribute('aSeam', new THREE.BufferAttribute(seamIdx, 1))
  g.setAttribute('aArc', new THREE.BufferAttribute(arc, 1))
  g.setAttribute('aImpact', new THREE.BufferAttribute(impact, 1))
  g.setAttribute('aTaper', new THREE.BufferAttribute(taper, 1))
  g.setIndex(new THREE.BufferAttribute(index, 1))
  g.computeBoundingSphere()
  // the line is widened in the shader — pad the bounds so it never culls early
  if (g.boundingSphere) g.boundingSphere.radius += 0.003
  return g
}

/** Per-seam state texture: texel i = (lacquer lo m, lacquer hi m, gold, polish). */
export function makeSeamState(count) {
  const data = new Float32Array(Math.max(1, count) * 4)
  const tex = new THREE.DataTexture(data, Math.max(1, count), 1, THREE.RGBAFormat, THREE.FloatType)
  tex.magFilter = tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return { data, tex }
}
