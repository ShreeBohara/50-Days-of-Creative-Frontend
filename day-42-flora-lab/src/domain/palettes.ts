import type { PaletteName } from './genome'

export interface PlantPalette {
  label: string
  stem: string
  stemDark: string
  leaf: string
  leafLight: string
  bloom: string
  bloomCenter: string
}

export const PLANT_PALETTES: Record<PaletteName, PlantPalette> = {
  herbarium: {
    label: 'Herbarium ink',
    stem: '#31543a',
    stemDark: '#1f4229',
    leaf: '#3e6847',
    leafLight: '#8da374',
    bloom: '#b4483e',
    bloomCenter: '#d2a24d',
  },
  alpine: {
    label: 'Alpine blue',
    stem: '#3e5c56',
    stemDark: '#293f3b',
    leaf: '#5c7a6e',
    leafLight: '#a7b9a6',
    bloom: '#627aa6',
    bloomCenter: '#c9a35a',
  },
  desert: {
    label: 'Desert ochre',
    stem: '#67573c',
    stemDark: '#443823',
    leaf: '#888054',
    leafLight: '#b9a56b',
    bloom: '#b96143',
    bloomCenter: '#d3a64e',
  },
  tropic: {
    label: 'Tropic specimen',
    stem: '#20564b',
    stemDark: '#123b33',
    leaf: '#287160',
    leafLight: '#73a76e',
    bloom: '#bd4162',
    bloomCenter: '#eca93b',
  },
}
