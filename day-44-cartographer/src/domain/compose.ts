// Compose the whole chart from a genome: heightfield → biomes → coastline →
// elevation contours → rivers → labels → title. This is the single object the
// renderer (and the thumbnail) consumes, and it is pure/deterministic.

import { contourLevels, traceContours, type ContourLevel, type Polyline } from './coastline'
import { placeLabels, worldName, type Label } from './names'
import { traceRivers } from './rivers'
import {
  classifyField,
  fieldStats,
  generateHeightfield,
  type FieldStats,
  type HeightField,
  type WorldParams,
} from './world'

export interface WorldMap {
  params: WorldParams
  size: number
  title: string
  field: HeightField
  biome: Uint8Array
  coastline: Polyline[]
  contours: ContourLevel[]
  rivers: Polyline[]
  labels: Label[]
  stats: FieldStats
}

/** Elevation isovalues for contour lines — four bands above sea level. */
export function contourThresholds(params: WorldParams): number[] {
  const sl = params.seaLevel
  const out: number[] = []
  for (let i = 1; i <= 4; i++) out.push(sl + (1 - sl) * (i / 5))
  return out
}

export function composeWorld(params: WorldParams): WorldMap {
  const field = generateHeightfield(params)
  return {
    params,
    size: field.size,
    title: worldName(params),
    field,
    biome: classifyField(field, params.seaLevel),
    coastline: traceContours(field.data, field.size, params.seaLevel),
    contours: contourLevels(field.data, field.size, contourThresholds(params)),
    rivers: traceRivers(field, params),
    labels: placeLabels(field, params),
    stats: fieldStats(field, params.seaLevel),
  }
}
