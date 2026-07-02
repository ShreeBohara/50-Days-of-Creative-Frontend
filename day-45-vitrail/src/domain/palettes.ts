// Jewel-glass palettes. Hues are kept as HSL tuples (not hex) so compose can
// jitter lightness/saturation per pane the way hand-blown glass varies.

import type { PaletteId } from './genome'

export interface GlassHue {
  h: number
  s: number
  l: number
}

export interface GlassPalette {
  id: PaletteId
  name: string
  note: string
  /** field glass, cycled through rings */
  glasses: GlassHue[]
  /** medallions, foils, rosettes */
  feature: GlassHue
  /** outer border chain / sill */
  border: GlassHue
}

export const PALETTES: Record<PaletteId, GlassPalette> = {
  chartres: {
    id: 'chartres',
    name: 'Chartres',
    note: 'the unrepeatable 12th-century blue, set against ruby',
    glasses: [
      { h: 221, s: 68, l: 40 },
      { h: 351, s: 66, l: 38 },
      { h: 230, s: 60, l: 30 },
      { h: 8, s: 62, l: 45 },
    ],
    feature: { h: 42, s: 78, l: 52 },
    border: { h: 350, s: 55, l: 28 },
  },
  'sainte-chapelle': {
    id: 'sainte-chapelle',
    name: 'Sainte-Chapelle',
    note: 'royal blue and crimson drowned in gold leaf',
    glasses: [
      { h: 227, s: 72, l: 34 },
      { h: 43, s: 82, l: 50 },
      { h: 349, s: 70, l: 40 },
      { h: 216, s: 64, l: 46 },
    ],
    feature: { h: 47, s: 88, l: 58 },
    border: { h: 227, s: 60, l: 24 },
  },
  forest: {
    id: 'forest',
    name: 'Greenwood',
    note: 'emerald, moss and cider light through the canopy',
    glasses: [
      { h: 152, s: 58, l: 32 },
      { h: 88, s: 46, l: 38 },
      { h: 38, s: 68, l: 48 },
      { h: 173, s: 52, l: 30 },
    ],
    feature: { h: 44, s: 76, l: 54 },
    border: { h: 152, s: 46, l: 20 },
  },
  ember: {
    id: 'ember',
    name: 'Embers',
    note: 'a furnace read through smoke — amber, rust, violet shadow',
    glasses: [
      { h: 32, s: 84, l: 48 },
      { h: 14, s: 74, l: 42 },
      { h: 352, s: 62, l: 36 },
      { h: 276, s: 38, l: 30 },
    ],
    feature: { h: 44, s: 90, l: 56 },
    border: { h: 14, s: 60, l: 24 },
  },
  moonlight: {
    id: 'moonlight',
    name: 'Grisaille',
    note: 'silver-stain and slate, the quiet north-aisle light',
    glasses: [
      { h: 218, s: 26, l: 52 },
      { h: 230, s: 30, l: 36 },
      { h: 204, s: 22, l: 62 },
      { h: 258, s: 26, l: 42 },
    ],
    feature: { h: 48, s: 48, l: 60 },
    border: { h: 230, s: 24, l: 26 },
  },
  rosarium: {
    id: 'rosarium',
    name: 'Rosarium',
    note: 'rose madder, magenta and violet, gilded at the heart',
    glasses: [
      { h: 336, s: 62, l: 46 },
      { h: 305, s: 48, l: 38 },
      { h: 268, s: 52, l: 40 },
      { h: 350, s: 70, l: 56 },
    ],
    feature: { h: 44, s: 80, l: 56 },
    border: { h: 305, s: 44, l: 24 },
  },
}

export const PALETTE_LIST: GlassPalette[] = Object.values(PALETTES)

export function getPalette(id: string): GlassPalette {
  return (PALETTES as Record<string, GlassPalette>)[id] ?? PALETTES.chartres
}

export function hslString(hue: GlassHue): string {
  return `hsl(${Math.round(hue.h)} ${Math.round(hue.s)}% ${Math.round(hue.l)}%)`
}

export function jitterHue(hue: GlassHue, amount: number, r1: number, r2: number, r3: number): GlassHue {
  return {
    h: hue.h + (r1 * 2 - 1) * 10 * amount,
    s: Math.min(96, Math.max(8, hue.s + (r2 * 2 - 1) * 14 * amount)),
    l: Math.min(88, Math.max(10, hue.l + (r3 * 2 - 1) * 14 * amount)),
  }
}
