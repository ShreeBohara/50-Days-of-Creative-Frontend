// Pure SVG path builders for leaded-glass shapes. Everything returns either
// plain points or `d` strings — no DOM, so it all runs in tests and workers.

export interface Pt {
  x: number
  y: number
}

const PRECISION = 100

export function fmt(n: number): number {
  return Math.round(n * PRECISION) / PRECISION
}

export function polar(cx: number, cy: number, r: number, angle: number): Pt {
  return { x: fmt(cx + r * Math.cos(angle)), y: fmt(cy + r * Math.sin(angle)) }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Circumcircle through three points — used to bow a lobe arc through a peak.
export function circleThrough3(p1: Pt, p2: Pt, p3: Pt): { center: Pt; radius: number } | null {
  const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y))
  if (Math.abs(d) < 1e-9) return null
  const s1 = p1.x * p1.x + p1.y * p1.y
  const s2 = p2.x * p2.x + p2.y * p2.y
  const s3 = p3.x * p3.x + p3.y * p3.y
  const ux = (s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d
  const uy = (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d
  const center = { x: ux, y: uy }
  return { center, radius: dist(center, p1) }
}

export function circlePath(cx: number, cy: number, r: number): string {
  const x0 = fmt(cx - r)
  const x1 = fmt(cx + r)
  return `M ${x0} ${fmt(cy)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${x1} ${fmt(cy)} A ${fmt(r)} ${fmt(r)} 0 1 1 ${x0} ${fmt(cy)} Z`
}

// A ring-slice pane: two radial edges joined by concentric arcs.
export function annularSectorPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p00 = polar(cx, cy, r0, a0)
  const p01 = polar(cx, cy, r0, a1)
  const p10 = polar(cx, cy, r1, a0)
  const p11 = polar(cx, cy, r1, a1)
  return [
    `M ${p00.x} ${p00.y}`,
    `L ${p10.x} ${p10.y}`,
    `A ${fmt(r1)} ${fmt(r1)} 0 ${large} 1 ${p11.x} ${p11.y}`,
    `L ${p01.x} ${p01.y}`,
    `A ${fmt(r0)} ${fmt(r0)} 0 ${large} 0 ${p00.x} ${p00.y}`,
    'Z',
  ].join(' ')
}

export type HeadStyle = 'geometric' | 'foil' | 'flamboyant'

// A petal pane: annular sector whose outer edge is shaped —
//   geometric  → flat concentric arc,
//   foil       → round lobe bowing through the outer radius,
//   flamboyant → ogee S-curves meeting in a pointed tip.
export function petalPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  style: HeadStyle,
): string {
  if (style === 'geometric') return annularSectorPath(cx, cy, r0, r1, a0, a1)

  const mid = (a0 + a1) / 2
  const shoulder = r0 + (r1 - r0) * (style === 'foil' ? 0.42 : 0.3)
  const large = a1 - a0 > Math.PI ? 1 : 0
  const base0 = polar(cx, cy, r0, a0)
  const base1 = polar(cx, cy, r0, a1)
  const sh0 = polar(cx, cy, shoulder, a0)
  const sh1 = polar(cx, cy, shoulder, a1)
  const tip = polar(cx, cy, r1, mid)

  let head: string
  if (style === 'foil') {
    const bow = circleThrough3(sh0, tip, sh1)
    head = bow
      ? `A ${fmt(bow.radius)} ${fmt(bow.radius)} 0 0 1 ${sh1.x} ${sh1.y}`
      : `L ${tip.x} ${tip.y} L ${sh1.x} ${sh1.y}`
  } else {
    // Ogee: ease out of each shoulder, reverse curvature into the tip.
    const waist = r0 + (r1 - r0) * 0.62
    const w0 = polar(cx, cy, waist, a0 + (mid - a0) * 0.35)
    const w1 = polar(cx, cy, waist, a1 - (a1 - mid) * 0.35)
    const flare0 = polar(cx, cy, r1 * 1.01, mid - (mid - a0) * 0.28)
    const flare1 = polar(cx, cy, r1 * 1.01, mid + (a1 - mid) * 0.28)
    head = [
      `C ${w0.x} ${w0.y} ${flare0.x} ${flare0.y} ${tip.x} ${tip.y}`,
      `C ${flare1.x} ${flare1.y} ${w1.x} ${w1.y} ${sh1.x} ${sh1.y}`,
    ].join(' ')
  }

  return [
    `M ${base0.x} ${base0.y}`,
    `L ${sh0.x} ${sh0.y}`,
    head,
    `L ${base1.x} ${base1.y}`,
    `A ${fmt(r0)} ${fmt(r0)} 0 ${large} 0 ${base0.x} ${base0.y}`,
    'Z',
  ].join(' ')
}

// Classic n-foil (trefoil, quatrefoil…): tangent lobe circles around a hub.
// Outer extent reaches exactly `r`.
export function foilPath(cx: number, cy: number, r: number, lobes: number, rotation = 0): string {
  const n = Math.max(3, Math.round(lobes))
  const sin = Math.sin(Math.PI / n)
  const c = r / (1 + sin)
  const rho = c * sin
  const cuspR = Math.sqrt(c * c - rho * rho)

  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const cuspAngle = rotation + ((i + 0.5) * 2 * Math.PI) / n
    const cusp = polar(cx, cy, cuspR, cuspAngle)
    parts.push(i === 0 ? `M ${cusp.x} ${cusp.y}` : `A ${fmt(rho)} ${fmt(rho)} 0 1 1 ${cusp.x} ${cusp.y}`)
  }
  const first = polar(cx, cy, cuspR, rotation + Math.PI / n)
  parts.push(`A ${fmt(rho)} ${fmt(rho)} 0 1 1 ${first.x} ${first.y}`)
  parts.push('Z')
  return parts.join(' ')
}

// Sample a two-centre pointed-arch head from left spring (0,0) to right
// spring (width,0), apex at (width/2, -rise). Returned as a polyline so
// tracery can tessellate nested bands from scaled copies.
export function sampleArchHead(width: number, rise: number, samples: number): Pt[] {
  const half = width / 2
  const apex = { x: half, y: -rise }
  // Two-centre arch: each arc's centre sits on the spring line, equidistant
  // from its spring point and the apex → cx = (half² + rise²) / (2·half).
  const centerX = (half * half + rise * rise) / (2 * half)
  const radius = centerX
  const leftCenter = { x: centerX, y: 0 }
  const rightCenter = { x: width - centerX, y: 0 }

  const startL = Math.atan2(0 - leftCenter.y, 0 - leftCenter.x)
  let endL = Math.atan2(apex.y - leftCenter.y, apex.x - leftCenter.x)
  if (endL < startL) endL += 2 * Math.PI // sweep upward over the apex, not under the springs
  const startR = Math.atan2(apex.y - rightCenter.y, apex.x - rightCenter.x)
  const endR = Math.atan2(0 - rightCenter.y, width - rightCenter.x)

  const half1 = Math.ceil(samples / 2)
  const half2 = samples - half1
  const pts: Pt[] = []
  for (let i = 0; i <= half1; i++) {
    const t = startL + ((endL - startL) * i) / half1
    pts.push(polar(leftCenter.x, leftCenter.y, radius, t))
  }
  for (let i = 1; i <= half2; i++) {
    const t = startR + ((endR - startR) * i) / half2
    pts.push(polar(rightCenter.x, rightCenter.y, radius, t))
  }
  return pts
}

export function polygonPath(points: readonly Pt[]): string {
  if (points.length === 0) return ''
  const [head, ...rest] = points
  return `M ${fmt(head.x)} ${fmt(head.y)} ${rest.map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`).join(' ')} Z`
}

// Scale + translate helpers for nesting arch bands toward a focus point.
export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
