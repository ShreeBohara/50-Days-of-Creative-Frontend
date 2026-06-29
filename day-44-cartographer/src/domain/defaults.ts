import { SCHEMA_VERSION, type WorldParams } from './world'

// The world shown on first load — a temperate, fjorded archipelago with a few
// rivers. Returns a fresh copy each call.
export function createDefaultParams(): WorldParams {
  return {
    version: SCHEMA_VERSION,
    seed: 'avalon',
    seaLevel: 0.44,
    relief: 0.28,
    octaves: 5,
    persistence: 0.5,
    mountainBias: 1.45,
    islandBias: 0.55,
    rivers: 4,
    biomePaletteId: 'atlas',
    languageId: 'norse',
    labelDensity: 0.6,
  }
}

export function cloneParams(p: WorldParams): WorldParams {
  return { ...p }
}
