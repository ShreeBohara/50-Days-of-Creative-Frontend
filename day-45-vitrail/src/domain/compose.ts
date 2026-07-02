// compose: WindowGenome → fully-resolved WindowSpec the renderer can paint.
// Tessellation is parametric; everything painterly (glass color, jitter,
// glow, the window's name) is seeded off the genome here.

import type { WindowGenome } from './genome'
import { createRng, pick, randInt, type Rng } from './random'
import { getPalette, hslString, jitterHue, type GlassPalette } from './palettes'
import { buildTracery, type PaneCell, type WindowFrame } from './tracery'

export interface PaneSpec extends PaneCell {
  fill: string
  /** 0..1 — how brightly this pane transmits the light behind it */
  glow: number
  /** 0..1 — normalized reveal order (center-out / bottom-up) */
  reveal: number
}

export interface WindowSpec {
  genome: WindowGenome
  frame: WindowFrame
  panes: PaneSpec[]
  leadPaths: string[]
  /** resolved lead came stroke width in viewbox units */
  leadWidth: number
  ringCount: number
  title: string
  palette: GlassPalette
}

interface RingPlan {
  base: number
  accent: number
  every: number
}

function paneFill(pane: PaneCell, plan: RingPlan, palette: GlassPalette, genome: WindowGenome): string {
  const paneRng = createRng(`${genome.seed}:pane:${pane.id}`)
  let hue
  if (pane.kind === 'medallion' || pane.kind === 'foil') {
    hue = pane.kind === 'foil' ? { ...palette.feature, l: palette.feature.l + 8 } : palette.feature
  } else if (pane.kind === 'border') {
    hue = pane.slot % 2 === 0 ? palette.border : { ...palette.border, l: palette.border.l + 7 }
  } else {
    const idx = pane.slot % plan.every === 0 ? plan.accent : plan.base
    hue = palette.glasses[idx % palette.glasses.length]
  }
  return hslString(jitterHue(hue, genome.jitter, paneRng(), paneRng(), paneRng()))
}

const TITLE_SAINTS = [
  'Alder', 'Brigid', 'Cecile', 'Dunstan', 'Elowen', 'Firmin', 'Gudula', 'Hilaire',
  'Isolde', 'Junien', 'Kilda', 'Lucien', 'Maëlle', 'Norbert', 'Odile', 'Perpetua',
] as const

const TITLE_LIGHTS = [
  'Morning', 'Vesper', 'Winter', 'Harvest', 'Candlemas', 'Equinox', 'Michaelmas', 'Advent',
] as const

const TITLE_NOUNS: Record<WindowGenome['archetype'], readonly string[]> = {
  rose: ['Rose', 'Wheel', 'Oculus', 'Corona'],
  lancet: ['Lancet', 'Light', 'Vigil', 'Candle'],
  triptych: ['Triptych', 'Choir', 'Procession', 'Litany'],
}

export function windowTitle(genome: WindowGenome): string {
  const rng: Rng = createRng(`${genome.seed}:title`)
  const noun = pick(rng, TITLE_NOUNS[genome.archetype])
  const saint = pick(rng, TITLE_SAINTS)
  const light = pick(rng, TITLE_LIGHTS)
  const form = randInt(rng, 0, 2)
  if (form === 0) return `The ${light} ${noun}`
  if (form === 1) return `${noun} of Saint ${saint}`
  return `Saint ${saint}'s ${light} ${noun}`
}

export function composeWindow(genome: WindowGenome): WindowSpec {
  const tracery = buildTracery(genome)
  const palette = getPalette(genome.paletteId)
  const rng = createRng(`${genome.seed}:glass`)

  // Rings cycle through the palette from a seeded offset so neighbouring
  // rings never repeat a glass; accents are free picks.
  const plans: RingPlan[] = []
  const cycleOffset = randInt(rng, 0, palette.glasses.length - 1)
  for (let ring = 0; ring < tracery.ringCount; ring++) {
    plans.push({
      base: (cycleOffset + ring) % palette.glasses.length,
      accent: randInt(rng, 0, palette.glasses.length - 1),
      every: pick(rng, [2, 3, 4] as const),
    })
  }

  const revealDivisor = Math.max(1, tracery.ringCount - 1)
  const panes: PaneSpec[] = tracery.panes.map((pane) => {
    const paneRng = createRng(`${genome.seed}:glow:${pane.id}`)
    return {
      ...pane,
      fill: paneFill(pane, plans[pane.ring], palette, genome),
      glow: 0.55 + paneRng() * 0.45,
      reveal: pane.ring / revealDivisor,
    }
  })

  return {
    genome,
    frame: tracery.frame,
    panes,
    leadPaths: tracery.leadPaths,
    leadWidth: 1.6 + genome.leadWidth * 1.15,
    ringCount: tracery.ringCount,
    title: windowTitle(genome),
    palette,
  }
}
