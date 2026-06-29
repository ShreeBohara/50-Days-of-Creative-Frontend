import { describe, expect, it } from 'vitest'
import {
  contourLevels,
  contourSegments,
  polylineToPath,
  stitchSegments,
  traceContours,
} from './coastline'
import { generateHeightfield, type WorldParams, SCHEMA_VERSION } from './world'

// A 2×2 field is one marching-squares cell.
function cell(va: number, vb: number, vc: number, vd: number): Float32Array {
  // row-major: [TL, TR, BL, BR] = indices [0,1,2,3] for size 2
  return new Float32Array([va, vb, vd, vc])
}

describe('contourSegments', () => {
  it('returns nothing when the whole cell is on one side', () => {
    expect(contourSegments(cell(1, 1, 1, 1), 2, 0.5)).toHaveLength(0)
    expect(contourSegments(cell(0, 0, 0, 0), 2, 0.5)).toHaveLength(0)
  })

  it('cuts the two edges around a single high corner, interpolated', () => {
    // Only top-left above 0.5 → case 1 → connects left & top edge midpoints.
    const segs = contourSegments(cell(1, 0, 0, 0), 2, 0.5)
    expect(segs).toHaveLength(1)
    const [p, q] = segs[0]
    const pts = [p, q].map((pt) => `${pt.x},${pt.y}`).sort()
    expect(pts).toEqual(['0,0.5', '0.5,0'])
  })

  it('emits two segments for a saddle case', () => {
    // TL and BR high, TR and BL low → ambiguous saddle → 2 segments.
    expect(contourSegments(cell(1, 0, 1, 0), 2, 0.5)).toHaveLength(2)
  })
})

describe('stitchSegments', () => {
  it('joins a chain of segments into one polyline', () => {
    const lines = stitchSegments([
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveLength(3)
  })

  it('closes a loop back to its start', () => {
    const lines = stitchSegments([
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      [
        { x: 1, y: 1 },
        { x: 0, y: 0 },
      ],
    ])
    expect(lines).toHaveLength(1)
    const loop = lines[0]
    expect(loop[0]).toEqual(loop[loop.length - 1])
  })
})

function makeParams(over: Partial<WorldParams> = {}): WorldParams {
  return {
    version: SCHEMA_VERSION,
    seed: 'thule',
    seaLevel: 0.45,
    relief: 0.2,
    octaves: 5,
    persistence: 0.5,
    mountainBias: 1.2,
    islandBias: 0.7,
    rivers: 2,
    biomePaletteId: 'atlas',
    languageId: 'norse',
    labelDensity: 0.5,
    ...over,
  }
}

describe('traceContours on a real field', () => {
  it('is deterministic and produces a non-empty coastline', () => {
    const f = generateHeightfield(makeParams())
    const a = traceContours(f.data, f.size, 0.45)
    const b = traceContours(f.data, f.size, 0.45)
    expect(a.length).toBeGreaterThan(0)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('traces multiple elevation levels', () => {
    const f = generateHeightfield(makeParams())
    const levels = contourLevels(f.data, f.size, [0.55, 0.7, 0.85])
    expect(levels).toHaveLength(3)
    expect(levels.every((l) => Array.isArray(l.polylines))).toBe(true)
  })
})

describe('polylineToPath', () => {
  it('builds an M/L path and optionally closes it', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ]
    expect(polylineToPath(line, 10)).toBe('M0.00 0.00L10.00 20.00')
    expect(polylineToPath(line, 10, true)).toBe('M0.00 0.00L10.00 20.00Z')
    expect(polylineToPath([], 10)).toBe('')
  })
})
