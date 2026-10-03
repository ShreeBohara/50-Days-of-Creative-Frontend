// The paper engineer's view: every fold of the open spreads drawn live on the
// moving paper (valleys blue, mountains pink, glue lines green, flap hinges
// yellow), seen through the card, so the mechanism behind each pop-up shows.

import { useFrame, useThree } from '@react-three/fiber'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { toWorld } from '../paper/kinematics.js'
import { contains } from '../paper/polygon.js'
import { rt, store } from '../state/store.js'

const KINDS = [
  { type: 'valley', color: '#3d8bff', width: 2.6, dashed: true, dash: 0.42, gap: 0.22 },
  { type: 'mountain', color: '#ff48b0', width: 2.6, dashed: true, dash: 0.6, gap: 0.2 },
  { type: 'glue', color: '#3ddc84', width: 3.2, dashed: false },
  { type: 'hinge', color: '#ffe800', width: 3.0, dashed: true, dash: 0.3, gap: 0.15 },
]
const MAX = 400

/** Distance from a point to a polygon (0 inside). */
function distTo(poly, x, y) {
  if (contains(poly, x, y)) return 0
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]
    const [bx, by] = poly[i]
    const ex = bx - ax
    const ey = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)))
    best = Math.min(best, Math.hypot(x - (ax + ex * t), y - (ay + ey * t)))
  }
  return best
}

const panelFor = new WeakMap()
/** Each fold/glue line rides on the panel nearest its midpoint. */
function linesOf(piece) {
  let out = panelFor.get(piece)
  if (out) return out
  out = []
  for (const l of [...piece.lines.folds, ...piece.lines.glue]) {
    const mx = (l.p0[0] + l.p1[0]) / 2
    const my = (l.p0[1] + l.p1[1]) / 2
    let key = null
    let best = Infinity
    for (const pn of piece.panels) {
      const d = distTo(pn.poly, mx, my)
      if (d < best) {
        best = d
        key = pn.key
      }
    }
    if (key) out.push({ ...l, key: `${piece.id}.${key}` })
  }
  panelFor.set(piece, out)
  return out
}

// one set of line objects for the page (there is only ever one x-ray), kept
// outside React so the frame loop can rewrite them freely
let shared = null
function getLayers() {
  if (shared) return shared
  shared = KINDS.map((k) => {
    const geo = new LineSegmentsGeometry()
    geo.setPositions(new Float32Array(MAX * 6))
    const mat = new LineMaterial({
      color: k.color,
      linewidth: k.width,
      dashed: k.dashed,
      dashSize: k.dash ?? 1,
      gapSize: k.gap ?? 0,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
      worldUnits: false,
    })
    const line = new LineSegments2(geo, mat)
    line.frustumCulled = false
    line.renderOrder = 10
    line.visible = false
    line.userData.warm = true
    return { ...k, geo, mat, line, buf: new Float32Array(MAX * 6), n: 0 }
  })
  return shared
}

export default function XRay() {
  const size = useThree((s) => s.size)

  useFrame(() => {
    const on = store.get().xray
    const layers = getLayers()
    for (const L of layers) {
      L.line.visible = false
      L.n = 0
      L.mat.resolution.set(size.width, size.height)
    }
    if (!on || !rt.view) return
    for (const sh of rt.view.sheets) {
      if (!sh.pose) continue
      for (const p of sh.spread.pieces) {
        for (const l of linesOf(p)) {
          const f = sh.pose.frames.get(l.key)
          const L = layers.find((x) => x.type === l.type)
          if (!f || !L || L.n >= MAX) continue
          const a = toWorld(f, l.p0[0], l.p0[1])
          const b = toWorld(f, l.p1[0], l.p1[1])
          L.buf.set([a[0], a[1], a[2], b[0], b[1], b[2]], L.n * 6)
          L.n++
        }
      }
    }
    for (const L of layers) {
      if (!L.n) continue
      L.geo.setPositions(L.buf.subarray(0, L.n * 6))
      if (L.dashed) L.line.computeLineDistances()
      L.line.visible = true
    }
  })

  return (
    <>
      {getLayers().map((L) => (
        <primitive key={L.type} object={L.line} />
      ))}
    </>
  )
}
