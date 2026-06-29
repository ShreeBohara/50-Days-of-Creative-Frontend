// Render the biome field to a small PNG data URL, with a NW hillshade on land so
// the relief reads. Used as the painted base layer under the engraved vector ink.
// Browser-only (uses <canvas>); never imported by the pure domain tests.

import type { WorldMap } from '../domain/compose'
import { biomeColor, type Palette } from '../domain/palettes'

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

/** Cheap NW-lit hillshade multiplier in roughly [0.7, 1.2]. */
function hillshade(data: Float32Array, size: number, x: number, y: number): number {
  const at = (ix: number, iy: number) =>
    data[Math.max(0, Math.min(size - 1, iy)) * size + Math.max(0, Math.min(size - 1, ix))]
  const dzdx = at(x + 1, y) - at(x - 1, y)
  const dzdy = at(x, y + 1) - at(x, y - 1)
  // light from the north-west
  const shade = 1 + (-dzdx - dzdy) * 6
  return Math.max(0.72, Math.min(1.2, shade))
}

export function renderBiomeRaster(map: WorldMap, palette: Palette): string {
  const { size, biome, field } = map
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(size, size)
  const out = img.data

  for (let i = 0; i < size * size; i++) {
    const b = biome[i]
    let [r, g, bl] = hexToRgb(biomeColor(palette, b))
    if (b >= 2) {
      const sh = hillshade(field.data, size, i % size, (i / size) | 0)
      r = clamp8(r * sh)
      g = clamp8(g * sh)
      bl = clamp8(bl * sh)
    }
    const o = i * 4
    out[o] = r
    out[o + 1] = g
    out[o + 2] = bl
    out[o + 3] = 255
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
