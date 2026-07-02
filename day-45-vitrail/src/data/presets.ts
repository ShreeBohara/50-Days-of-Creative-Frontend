// Curated windows. Each is just a genome — the entire window regrows from it.

import type { WindowGenome } from '../domain/genome'

export interface Preset {
  id: string
  name: string
  note: string
  genome: WindowGenome
}

export const PRESETS: Preset[] = [
  {
    id: 'chartres-noon',
    name: 'Chartres at Noon',
    note: 'the classic wheel — cobalt and ruby in twelve spokes',
    genome: {
      seed: 'chartres-noon',
      archetype: 'rose',
      symmetry: 12,
      rings: 4,
      density: 0.55,
      traceryStyle: 'foil',
      leadWidth: 3,
      paletteId: 'chartres',
      jitter: 0.35,
      medallion: 'blossom',
    },
  },
  {
    id: 'chapelle-vespers',
    name: 'Vespers Royale',
    note: 'sixteen-fold flamboyant, drowned in gold leaf',
    genome: {
      seed: 'vespers-royale',
      archetype: 'rose',
      symmetry: 16,
      rings: 5,
      density: 0.7,
      traceryStyle: 'flamboyant',
      leadWidth: 2.5,
      paletteId: 'sainte-chapelle',
      jitter: 0.45,
      medallion: 'star',
    },
  },
  {
    id: 'greenwood-matins',
    name: 'Greenwood Matins',
    note: 'a forest lancet — moss light through the canopy',
    genome: {
      seed: 'greenwood-matins',
      archetype: 'lancet',
      symmetry: 8,
      rings: 4,
      density: 0.6,
      traceryStyle: 'foil',
      leadWidth: 3.5,
      paletteId: 'forest',
      jitter: 0.5,
      medallion: 'blossom',
    },
  },
  {
    id: 'ember-evensong',
    name: 'Ember Evensong',
    note: 'an eight-spoke furnace wheel, geometric and severe',
    genome: {
      seed: 'ember-evensong',
      archetype: 'rose',
      symmetry: 8,
      rings: 3,
      density: 0.4,
      traceryStyle: 'geometric',
      leadWidth: 4.5,
      paletteId: 'ember',
      jitter: 0.3,
      medallion: 'cross',
    },
  },
  {
    id: 'north-aisle',
    name: 'North Aisle Grisaille',
    note: 'quiet silver-stain glass for the sunless side',
    genome: {
      seed: 'north-aisle',
      archetype: 'lancet',
      symmetry: 6,
      rings: 5,
      density: 0.35,
      traceryStyle: 'geometric',
      leadWidth: 2,
      paletteId: 'moonlight',
      jitter: 0.25,
      medallion: 'oculus',
    },
  },
  {
    id: 'rosarium-choir',
    name: 'Rosarium Choir',
    note: 'three lights in rose madder and violet',
    genome: {
      seed: 'rosarium-choir',
      archetype: 'triptych',
      symmetry: 12,
      rings: 3,
      density: 0.65,
      traceryStyle: 'foil',
      leadWidth: 3,
      paletteId: 'rosarium',
      jitter: 0.4,
      medallion: 'blossom',
    },
  },
]
