// Tessellation: WindowGenome → leaded pane cells. Purely parametric — no
// randomness lives here, so one genome always yields the identical window
// (color/jitter is applied later in compose from the genome seed).

import type { Medallion, WindowGenome } from './genome'
import {
  annularSectorPath,
  circlePath,
  foilPath,
  lerpPt,
  petalPath,
  polar,
  polygonPath,
  sampleArchHead,
  type HeadStyle,
  type Pt,
} from './geometry'

export type PaneKind = 'field' | 'border' | 'medallion' | 'foil'

export interface PaneCell {
  id: string
  path: string
  /** 0-based reveal/color band — center-out for roses, bottom-up for lancets */
  ring: number
  slot: number
  kind: PaneKind
  centroid: Pt
  /** rough relative size, used to scale glass jitter */
  areaHint: number
}

export interface WindowFrame {
  outline: string
  width: number
  height: number
  cx: number
  cy: number
}

export interface TraceryResult {
  frame: WindowFrame
  panes: PaneCell[]
  /** heavy structural lead drawn on top of pane strokes */
  leadPaths: string[]
  ringCount: number
}

const TAU = Math.PI * 2

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function polygonCentroid(points: readonly Pt[]): Pt {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

function polygonArea(points: readonly Pt[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return Math.abs(area / 2)
}

function medallionLobes(medallion: Medallion, symmetry: number): number {
  switch (medallion) {
    case 'star':
      return clamp(symmetry, 6, 16)
    case 'blossom':
      return clamp(Math.round(symmetry / 2), 5, 8)
    case 'cross':
      return 4
    case 'oculus':
      return 0
  }
}

/* ── rose window ────────────────────────────────────────────────────────── */

function buildRose(genome: WindowGenome): TraceryResult {
  const size = 1000
  const cx = size / 2
  const cy = size / 2
  const R = 460
  const borderInner = R * 0.93
  const medR = R * 0.17
  const top = -Math.PI / 2

  const panes: PaneCell[] = []

  // center medallion (ring 0)
  panes.push({
    id: 'medallion',
    path: circlePath(cx, cy, medR),
    ring: 0,
    slot: 0,
    kind: 'medallion',
    centroid: { x: cx, y: cy },
    areaHint: Math.PI * medR * medR,
  })
  const lobes = medallionLobes(genome.medallion, genome.symmetry)
  if (lobes > 0) {
    panes.push({
      id: 'medallion-foil',
      path: foilPath(cx, cy, medR * 0.82, lobes, top),
      ring: 0,
      slot: 1,
      kind: 'foil',
      centroid: { x: cx, y: cy },
      areaHint: Math.PI * medR * medR * 0.5,
    })
  }

  // field rings (rings 1..n)
  const n = genome.rings
  const radii: number[] = []
  for (let i = 0; i <= n; i++) {
    radii.push(medR + (borderInner - medR) * Math.pow(i / n, 0.92))
  }
  for (let i = 0; i < n; i++) {
    const r0 = radii[i]
    const r1 = radii[i + 1]
    const mult = clamp(Math.round(1 + genome.density * 2 * ((i + 1) / n)), 1, 3)
    const count = genome.symmetry * mult
    const step = TAU / count
    const offset = top + (i % 2 === 1 ? step / 2 : 0)

    const outermost = i === n - 1
    const innermost = i === 0
    let style: HeadStyle = 'geometric'
    if (outermost) style = genome.traceryStyle
    else if (innermost && genome.traceryStyle === 'foil') style = 'foil'

    for (let s = 0; s < count; s++) {
      const a0 = offset + s * step
      const a1 = a0 + step
      const rMid = (r0 + r1) / 2
      panes.push({
        id: `ring${i}-${s}`,
        path:
          style === 'geometric'
            ? annularSectorPath(cx, cy, r0, r1, a0, a1)
            : petalPath(cx, cy, r0, r1, a0, a1, style),
        ring: i + 1,
        slot: s,
        kind: 'field',
        centroid: polar(cx, cy, rMid, (a0 + a1) / 2),
        areaHint: (r1 - r0) * step * rMid,
      })
    }
  }

  // outer border chain (ring n+1)
  const borderCount = genome.symmetry * 3
  const bStep = TAU / borderCount
  for (let s = 0; s < borderCount; s++) {
    const a0 = top + s * bStep
    panes.push({
      id: `border-${s}`,
      path: annularSectorPath(cx, cy, borderInner, R, a0, a0 + bStep),
      ring: n + 1,
      slot: s,
      kind: 'border',
      centroid: polar(cx, cy, (borderInner + R) / 2, a0 + bStep / 2),
      areaHint: (R - borderInner) * bStep * ((borderInner + R) / 2),
    })
  }

  return {
    frame: { outline: circlePath(cx, cy, R), width: size, height: size, cx, cy },
    panes,
    leadPaths: [circlePath(cx, cy, R), circlePath(cx, cy, medR), circlePath(cx, cy, borderInner)],
    ringCount: n + 2,
  }
}

/* ── lancet lights (shared by lancet + triptych) ────────────────────────── */

interface LightOpts {
  prefix: string
  x: number
  width: number
  baseY: number
  springY: number
  /** arch rise as a fraction of light width */
  riseRatio: number
  ringOffset: number
}

function buildLight(genome: WindowGenome, opts: LightOpts, panes: PaneCell[], leadPaths: string[]): number {
  const { prefix, x, width, baseY, springY } = opts
  const rise = width * opts.riseRatio
  const samples = 2 * Math.round(14 + genome.density * 10)
  const arch = sampleArchHead(width, rise, samples).map((p) => ({ x: p.x + x, y: p.y + springY }))
  const focus: Pt = { x: x + width / 2, y: springY }

  // frame outline: base → left jamb → arch head → right jamb → base
  const outlinePts: Pt[] = [{ x, y: baseY }, ...arch, { x: x + width, y: baseY }]
  leadPaths.push(polygonPath(outlinePts))

  const pushPolygon = (id: string, pts: Pt[], ring: number, slot: number, kind: PaneKind) => {
    panes.push({
      id,
      path: polygonPath(pts),
      ring,
      slot,
      kind,
      centroid: polygonCentroid(pts),
      areaHint: polygonArea(pts),
    })
  }

  // body grid — ring 0 is a border sill, rows stack above it
  const cols = clamp(3 + Math.round(genome.density * 3) + Math.round((genome.symmetry - 6) / 5), 3, 9)
  const rows = genome.rings + 1
  const sillH = 30
  const bodyTop = springY
  const bodyH = baseY - sillH - bodyTop
  const colW = width / cols

  for (let c = 0; c < cols; c++) {
    pushPolygon(
      `${prefix}sill-${c}`,
      [
        { x: x + c * colW, y: baseY - sillH },
        { x: x + (c + 1) * colW, y: baseY - sillH },
        { x: x + (c + 1) * colW, y: baseY },
        { x: x + c * colW, y: baseY },
      ],
      opts.ringOffset,
      c,
      'border',
    )
  }

  const rowH = bodyH / rows
  for (let r = 0; r < rows; r++) {
    const y1 = baseY - sillH - r * rowH
    const y0 = y1 - rowH
    for (let c = 0; c < cols; c++) {
      pushPolygon(
        `${prefix}row${r}-${c}`,
        [
          { x: x + c * colW, y: y0 },
          { x: x + (c + 1) * colW, y: y0 },
          { x: x + (c + 1) * colW, y: y1 },
          { x: x + c * colW, y: y1 },
        ],
        opts.ringOffset + 1 + r,
        c,
        'field',
      )
    }
  }

  // arch head: nested bands of the sampled outline shrinking toward the focus
  const headBands = clamp(Math.round(1 + genome.density * 2), 1, 3)
  const bandThickness = 0.16
  const segments = clamp(Math.round(genome.symmetry * (0.5 + genome.density * 0.5)), 4, 14)
  const perSeg = Math.floor(arch.length / segments)

  let ring = opts.ringOffset + 1 + rows
  for (let b = 0; b < headBands; b++) {
    const tOuter = 1 - b * bandThickness
    const tInner = tOuter - bandThickness
    const outer = arch.map((p) => lerpPt(focus, p, tOuter))
    const inner = arch.map((p) => lerpPt(focus, p, tInner))
    for (let s = 0; s < segments; s++) {
      const i0 = s * perSeg
      const i1 = s === segments - 1 ? arch.length - 1 : (s + 1) * perSeg
      const pts = [...outer.slice(i0, i1 + 1), ...inner.slice(i0, i1 + 1).reverse()]
      pushPolygon(`${prefix}head${b}-${s}`, pts, ring, s, 'field')
    }
    ring++
  }

  // inner head plate + rosette
  const tIn = 1 - headBands * bandThickness
  const plate = arch.map((p) => lerpPt(focus, p, tIn))
  pushPolygon(`${prefix}plate`, plate, ring, 0, 'field')

  const lobes = medallionLobes(genome.medallion, genome.symmetry)
  const roseR = width * tIn * 0.24
  const roseC: Pt = { x: focus.x, y: springY - rise * tIn * 0.42 }
  panes.push({
    id: `${prefix}rosette`,
    path: lobes > 0 ? foilPath(roseC.x, roseC.y, roseR, lobes, -Math.PI / 2) : circlePath(roseC.x, roseC.y, roseR),
    ring: ring + 1,
    slot: 0,
    kind: 'medallion',
    centroid: roseC,
    areaHint: Math.PI * roseR * roseR,
  })

  return ring + 2 - opts.ringOffset
}

function buildLancet(genome: WindowGenome): TraceryResult {
  const width = 700
  const height = 1000
  const panes: PaneCell[] = []
  const leadPaths: string[] = []
  const lightW = 520
  const x = (width - lightW) / 2
  const rings = buildLight(
    genome,
    { prefix: '', x, width: lightW, baseY: 930, springY: 460, riseRatio: 0.72, ringOffset: 0 },
    panes,
    leadPaths,
  )
  return {
    frame: { outline: leadPaths[0], width, height, cx: width / 2, cy: 500 },
    panes,
    leadPaths,
    ringCount: rings,
  }
}

function buildTriptych(genome: WindowGenome): TraceryResult {
  const width = 1000
  const height = 1000
  const panes: PaneCell[] = []
  const leadPaths: string[] = []
  const gap = 36
  const sideW = 272
  const centerW = width - 2 * sideW - 2 * gap - 80
  const x0 = 40

  const left = buildLight(
    genome,
    { prefix: 'a-', x: x0, width: sideW, baseY: 930, springY: 560, riseRatio: 0.66, ringOffset: 0 },
    panes,
    leadPaths,
  )
  const center = buildLight(
    genome,
    {
      prefix: 'b-',
      x: x0 + sideW + gap,
      width: centerW,
      baseY: 930,
      springY: 470,
      riseRatio: 0.74,
      ringOffset: 0,
    },
    panes,
    leadPaths,
  )
  const right = buildLight(
    genome,
    {
      prefix: 'c-',
      x: x0 + sideW + centerW + 2 * gap,
      width: sideW,
      baseY: 930,
      springY: 560,
      riseRatio: 0.66,
      ringOffset: 0,
    },
    panes,
    leadPaths,
  )

  return {
    frame: { outline: leadPaths.join(' '), width, height, cx: width / 2, cy: 500 },
    panes,
    leadPaths,
    ringCount: Math.max(left, center, right),
  }
}

export function buildTracery(genome: WindowGenome): TraceryResult {
  switch (genome.archetype) {
    case 'rose':
      return buildRose(genome)
    case 'lancet':
      return buildLancet(genome)
    case 'triptych':
      return buildTriptych(genome)
  }
}
