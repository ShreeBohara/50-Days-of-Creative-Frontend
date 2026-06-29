// Hypsometric tints + structural inks for the chart. `biomes` is indexed by the
// BIOMES order in world.ts: deep, ocean, shore, lowland, grass, forest,
// highland, mountain, peak.

export interface Palette {
  id: string
  name: string
  /** Coastline + label ink. */
  ink: string
  /** Elevation contour lines. */
  contour: string
  /** River strokes. */
  river: string
  /** Lat/long graticule. */
  graticule: string
  /** Base ocean wash behind the deep/shallow tints. */
  ocean: string
  /** Per-biome fills (9 entries). */
  biomes: string[]
}

export const PALETTES: Palette[] = [
  {
    id: 'atlas',
    name: 'Atlas Sepia',
    ink: '#3a2c1a',
    contour: '#9a8763',
    river: '#5f8a86',
    graticule: 'rgba(58,44,26,0.18)',
    ocean: '#9bb7b1',
    biomes: ['#7d9b94', '#9bb7b1', '#e7dcc0', '#d8c9a0', '#cdbb8c', '#b6a677', '#c2a878', '#b29063', '#efe6d0'],
  },
  {
    id: 'verdant',
    name: 'Verdant',
    ink: '#243018',
    contour: '#6f8a4e',
    river: '#3f7a8c',
    graticule: 'rgba(36,48,24,0.18)',
    ocean: '#5d8a93',
    biomes: ['#38606a', '#5d8a93', '#dce6b6', '#aac57f', '#8fb566', '#5f8f44', '#7e9a55', '#8a7d52', '#f1f0e2'],
  },
  {
    id: 'arctic',
    name: 'Arctic',
    ink: '#2a3b48',
    contour: '#8aa0ad',
    river: '#4f7fa8',
    graticule: 'rgba(42,59,72,0.16)',
    ocean: '#9db8cf',
    biomes: ['#6f8aa6', '#9db8cf', '#eef3f6', '#dbe5ea', '#c9d6dc', '#a6bcc3', '#bcc9cf', '#d3dadd', '#ffffff'],
  },
  {
    id: 'desert',
    name: 'Desert',
    ink: '#4a3417',
    contour: '#a9824a',
    river: '#7f9a8e',
    graticule: 'rgba(74,52,23,0.18)',
    ocean: '#c4bf86',
    biomes: ['#9c9a6f', '#c4bf86', '#f0e4be', '#e6cf94', '#d8b873', '#b89a55', '#c39a5e', '#a87a45', '#f4ead0'],
  },
  {
    id: 'volcanic',
    name: 'Volcanic',
    ink: '#221a22',
    contour: '#8a6354',
    river: '#5a6f86',
    graticule: 'rgba(34,26,34,0.22)',
    ocean: '#45414f',
    biomes: ['#2a2533', '#45414f', '#7b6a5e', '#5e4a44', '#6f5446', '#4f3d38', '#7a4f3e', '#a3563a', '#eec07a'],
  },
]

export const DEFAULT_PALETTE = PALETTES[0]

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE
}

export function biomeColor(palette: Palette, index: number): string {
  return palette.biomes[index] ?? palette.biomes[0]
}
