// Card geometry. A panel is a die-cut polygon (card cm, y down) given real
// thickness: a printed front cap, a printed back cap (mirrored, as the back is
// painted flipped over) and a white core around the cut edge. Built once in
// the card's own coordinates; a panel's pose is only ever its matrix.
//
// Local mesh space: x = card x, y = −card y (so the frame's ey is +y), z along
// the front normal. Groups: 0 = front, 1 = back, 2 = cut edge.

import * as THREE from 'three'
import { CARD, H, LEAF, W } from '../paper/dims.js'

const v2 = (p) => new THREE.Vector2(p[0], -p[1])

/**
 * uv(x, y, back) maps a card point to atlas uv for the front or back cap.
 * thickness defaults to card stock.
 */
export function panelGeometry(poly, holes, uv, thickness = CARD) {
  let contour = poly.map(v2)
  let holeLoops = holes.map((h) => h.map(v2))
  // earcut wants a counter-clockwise contour and clockwise holes (in y-up space)
  if (THREE.ShapeUtils.isClockWise(contour)) contour = contour.slice().reverse()
  holeLoops = holeLoops.map((h) => (THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse()))
  const tris = THREE.ShapeUtils.triangulateShape(contour, holeLoops)
  const pts = [...contour, ...holeLoops.flat()]
  const pos = []
  const nrm = []
  const uvs = []
  const idx = []
  const groups = []
  const z = thickness / 2

  // front cap
  let start = idx.length
  let base = 0
  for (const p of pts) {
    pos.push(p.x, p.y, z)
    nrm.push(0, 0, 1)
    uvs.push(...uv(p.x, -p.y, false))
  }
  for (const [a, b, c] of tris) {
    // counter-clockwise in y-up space faces +z
    const cr = (pts[b].x - pts[a].x) * (pts[c].y - pts[a].y) - (pts[b].y - pts[a].y) * (pts[c].x - pts[a].x)
    if (cr >= 0) idx.push(base + a, base + b, base + c)
    else idx.push(base + a, base + c, base + b)
  }
  groups.push([start, idx.length - start, 0])

  // back cap
  start = idx.length
  base = pts.length
  for (const p of pts) {
    pos.push(p.x, p.y, -z)
    nrm.push(0, 0, -1)
    uvs.push(...uv(p.x, -p.y, true))
  }
  for (const [a, b, c] of tris) {
    const cr = (pts[b].x - pts[a].x) * (pts[c].y - pts[a].y) - (pts[b].y - pts[a].y) * (pts[c].x - pts[a].x)
    if (cr >= 0) idx.push(base + a, base + c, base + b)
    else idx.push(base + a, base + b, base + c)
  }
  groups.push([start, idx.length - start, 1])

  // cut edge: a quad per polygon edge, normals pointing out of the paper
  start = idx.length
  const ring = (loop) => {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]
      const b = loop[(i + 1) % loop.length]
      const ex = b.x - a.x
      const ey = b.y - a.y
      const l = Math.hypot(ex, ey) || 1
      // contour is CCW and holes CW, so out of the paper is right of travel
      const nx = ey / l
      const ny = -ex / l
      const k = pos.length / 3
      pos.push(a.x, a.y, z, b.x, b.y, z, b.x, b.y, -z, a.x, a.y, -z)
      for (let j = 0; j < 4; j++) {
        nrm.push(nx, ny, 0)
        uvs.push(0, 0)
      }
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2)
    }
  }
  ring(contour)
  for (const h of holeLoops) ring(h)
  groups.push([start, idx.length - start, 2])

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  for (const [s, c, m] of groups) g.addGroup(s, c, m)
  g.computeBoundingSphere()
  return g
}

/**
 * A leaf: a board W × H × LEAF in leaf space — x from the spine out, y along
 * the front normal, z along the spine (head −H/2 … tail +H/2). Groups:
 * 0 = front (a right-hand page), 1 = back (a left-hand page), 2 = edges.
 * uvs map page images (v down from the head): front x = spine→edge, back
 * mirrored; pass uvFront/uvBack to map something else (the cover boards).
 */
export function leafGeometry(
  width = W,
  height = H,
  thick = LEAF,
  corner = 0.35,
  uvFront = (x, z) => [x / width, (z + height / 2) / height],
  uvBack = (x, z) => [1 - x / width, (z + height / 2) / height],
) {
  // a slightly rounded fore-edge corner, like real board books
  const outline = []
  const k = 5
  outline.push([0, -height / 2])
  for (let i = 0; i <= k; i++) {
    const t = -Math.PI / 2 + (i / k) * (Math.PI / 2)
    outline.push([width - corner + Math.cos(t) * corner, -height / 2 + corner + Math.sin(t) * corner])
  }
  for (let i = 0; i <= k; i++) {
    const t = (i / k) * (Math.PI / 2)
    outline.push([width - corner + Math.cos(t) * corner, height / 2 - corner + Math.sin(t) * corner])
  }
  outline.push([0, height / 2])
  const pts = outline.map(([x, zz]) => new THREE.Vector2(x, zz))
  const tris = THREE.ShapeUtils.triangulateShape(pts, [])
  const pos = []
  const nrm = []
  const uvs = []
  const idx = []
  const y = thick / 2
  // front (+y): page image x = distance from spine, image y = z + H/2
  for (const p of pts) {
    pos.push(p.x, y, p.y)
    nrm.push(0, 1, 0)
    uvs.push(...uvFront(p.x, p.y))
  }
  for (const [a, b, c] of tris) {
    // seen from +y, (x, z) is clockwise-mirrored: pick the winding that faces up
    const cr = (pts[b].x - pts[a].x) * (pts[c].y - pts[a].y) - (pts[b].y - pts[a].y) * (pts[c].x - pts[a].x)
    if (cr < 0) idx.push(a, b, c)
    else idx.push(a, c, b)
  }
  const nFront = idx.length
  const base = pts.length
  for (const p of pts) {
    pos.push(p.x, -y, p.y)
    nrm.push(0, -1, 0)
    uvs.push(...uvBack(p.x, p.y))
  }
  for (const [a, b, c] of tris) {
    const cr = (pts[b].x - pts[a].x) * (pts[c].y - pts[a].y) - (pts[b].y - pts[a].y) * (pts[c].x - pts[a].x)
    if (cr < 0) idx.push(base + a, base + c, base + b)
    else idx.push(base + a, base + b, base + c)
  }
  const nBack = idx.length - nFront
  // edges (all but the closing spine edge, hidden in the binding)
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const ex = b.x - a.x
    const ez = b.y - a.y
    const l = Math.hypot(ex, ez) || 1
    const k2 = pos.length / 3
    pos.push(a.x, y, a.y, b.x, y, b.y, b.x, -y, b.y, a.x, -y, a.y)
    // outward in the leaf plane
    for (let j = 0; j < 4; j++) {
      nrm.push(ez / l, 0, -ex / l)
      uvs.push(0, 0)
    }
    idx.push(k2, k2 + 1, k2 + 2, k2, k2 + 2, k2 + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  g.addGroup(0, nFront, 0)
  g.addGroup(nFront, nBack, 1)
  g.addGroup(nFront + nBack, idx.length - nFront - nBack, 2)
  g.computeBoundingSphere()
  return g
}

const _m = new THREE.Matrix4()
/** Write a solver frame {o, ex, ey, n} into an object's matrix (+ lift along n). */
export function applyFrame(obj, f, lift = 0) {
  _m.set(
    f.ex[0], f.ey[0], f.n[0], f.o[0] + f.n[0] * lift,
    f.ex[1], f.ey[1], f.n[1], f.o[1] + f.n[1] * lift,
    f.ex[2], f.ey[2], f.n[2], f.o[2] + f.n[2] * lift,
    0, 0, 0, 1,
  )
  obj.matrix.copy(_m)
  obj.matrixWorldNeedsUpdate = true
}

/**
 * Leaf pose at angle phi: rotate about the spine, thickness kept on the stack
 * side. A front board (`cover`) instead keeps its INSIDE face on the hinge
 * plane at every angle — its pages' pop-ups are glued there — and so lies on
 * top of the stack when shut and under it when open.
 */
export function applyLeaf(obj, phi, thick = LEAF, cover = false) {
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  // front normal n = (−sin, cos, 0); centre offset −(t/2)·cos φ·n keeps the
  // printed face that is up lying on the hinge plane at rest on either stack
  const off = cover ? thick / 2 : -(thick / 2) * c
  _m.set(c, -s, 0, -s * off, s, c, 0, c * off, 0, 0, 1, 0, 0, 0, 0, 1)
  obj.matrix.copy(_m)
  obj.matrixWorldNeedsUpdate = true
}
