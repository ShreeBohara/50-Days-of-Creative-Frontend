import type { PlantGenomeV1 } from './genome'
import { randomBetween, randomFor } from './random'

export interface BranchGeometry {
  id: string
  path: string
  width: number
  depth: number
  terminal: boolean
  start: { x: number; y: number }
  end: { x: number; y: number }
  angle: number
}

export interface LeafGeometry {
  id: string
  x: number
  y: number
  angle: number
  scale: number
  side: -1 | 1
  depth: number
}

export interface BloomGeometry {
  id: string
  x: number
  y: number
  angle: number
  scale: number
  depth: number
}

export interface PlantScene {
  branches: BranchGeometry[]
  leaves: LeafGeometry[]
  blooms: BloomGeometry[]
}

interface BranchInput {
  id: string
  x: number
  y: number
  angle: number
  length: number
  width: number
  level: number
}

const round = (value: number) => Math.round(value * 100) / 100
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

function pointAlong(branch: BranchGeometry, progress: number) {
  return {
    x: branch.start.x + (branch.end.x - branch.start.x) * progress,
    y: branch.start.y + (branch.end.y - branch.start.y) * progress,
  }
}

function childAngles(genome: PlantGenomeV1, branch: BranchInput): number[] {
  const { spread, symmetry } = genome.architecture
  const wobble = randomBetween(genome.seed, `${branch.id}/fork-wobble`, -4, 4)

  if (symmetry === 'spiral') {
    const spin = branch.level % 2 === 0 ? 1 : -1
    return [branch.angle - spread * 0.72 * spin + wobble, branch.angle + spread * 0.42 * spin - wobble]
  }

  if (symmetry === 'radial' && branch.level < genome.architecture.branchDepth - 2) {
    return [branch.angle - spread + wobble, branch.angle + wobble * 0.4, branch.angle + spread - wobble]
  }

  return [branch.angle - spread + wobble, branch.angle + spread - wobble]
}

export function generatePlantScene(genome: PlantGenomeV1): PlantScene {
  const branches: BranchGeometry[] = []
  const leaves: LeafGeometry[] = []
  const blooms: BloomGeometry[] = []
  const queue: BranchInput[] = [{
    id: 'root',
    x: 400,
    y: 910,
    angle: -90,
    length: 238,
    width: 15,
    level: 0,
  }]

  while (queue.length > 0 && branches.length < 220) {
    const branch = queue.shift()!
    const terminal = branch.level >= genome.architecture.branchDepth - 1
    const angleNoise = randomBetween(genome.seed, `${branch.id}/angle`, -4.5, 4.5)
    const finalAngle = branch.angle + angleNoise
    const radians = toRadians(finalAngle)
    const endX = branch.x + Math.cos(radians) * branch.length
    const endY = branch.y + Math.sin(radians) * branch.length
    const bend = genome.architecture.curvature * branch.length
    const normalX = -Math.sin(radians)
    const normalY = Math.cos(radians)
    const bendDirection = randomFor(genome.seed, `${branch.id}/bend-direction`) > 0.5 ? 1 : -1
    const controlOneX = branch.x + Math.cos(radians) * branch.length * 0.34 + normalX * bend * bendDirection
    const controlOneY = branch.y + Math.sin(radians) * branch.length * 0.34 + normalY * bend * bendDirection
    const controlTwoX = branch.x + Math.cos(radians) * branch.length * 0.72 - normalX * bend * 0.42 * bendDirection
    const controlTwoY = branch.y + Math.sin(radians) * branch.length * 0.72 - normalY * bend * 0.42 * bendDirection

    const geometry: BranchGeometry = {
      id: branch.id,
      path: `M ${round(branch.x)} ${round(branch.y)} C ${round(controlOneX)} ${round(controlOneY)}, ${round(controlTwoX)} ${round(controlTwoY)}, ${round(endX)} ${round(endY)}`,
      width: round(Math.max(1.4, branch.width)),
      depth: branch.level,
      terminal,
      start: { x: round(branch.x), y: round(branch.y) },
      end: { x: round(endX), y: round(endY) },
      angle: round(finalAngle),
    }
    branches.push(geometry)

    const leafSlots = terminal ? 3 : Math.max(1, 3 - branch.level)
    for (let slot = 0; slot < leafSlots; slot += 1) {
      const leafId = `${branch.id}/leaf-${slot}`
      if (randomFor(genome.seed, `${leafId}/presence`) > genome.foliage.density) continue
      const progress = terminal ? 0.34 + slot * 0.22 : 0.42 + slot * 0.26
      const anchor = pointAlong(geometry, progress)
      const arrangement = genome.foliage.arrangement
      const side: -1 | 1 = arrangement === 'opposite'
        ? (slot % 2 === 0 ? -1 : 1)
        : randomFor(genome.seed, `${leafId}/side`) > 0.5 ? 1 : -1
      const goldenOffset = arrangement === 'golden' ? slot * 18 : 0

      leaves.push({
        id: leafId,
        x: round(anchor.x),
        y: round(anchor.y),
        angle: round(finalAngle + side * (58 + goldenOffset) + randomBetween(genome.seed, `${leafId}/angle`, -9, 9)),
        scale: round(genome.foliage.size * randomBetween(genome.seed, `${leafId}/scale`, 0.78, 1.18)),
        side,
        depth: branch.level,
      })

      if (arrangement === 'opposite' && randomFor(genome.seed, `${leafId}/pair`) < genome.foliage.density) {
        leaves.push({
          id: `${leafId}/pair`,
          x: round(anchor.x),
          y: round(anchor.y),
          angle: round(finalAngle - side * 58 + randomBetween(genome.seed, `${leafId}/pair-angle`, -7, 7)),
          scale: round(genome.foliage.size * randomBetween(genome.seed, `${leafId}/pair-scale`, 0.78, 1.14)),
          side: side === 1 ? -1 : 1,
          depth: branch.level,
        })
      }
    }

    if (terminal) {
      if (genome.bloom.form !== 'none' && randomFor(genome.seed, `${branch.id}/bloom`) <= genome.bloom.density) {
        blooms.push({
          id: `${branch.id}/bloom`,
          x: round(endX),
          y: round(endY),
          angle: round(finalAngle + 90),
          scale: round(genome.bloom.scale * randomBetween(genome.seed, `${branch.id}/bloom-scale`, 0.82, 1.18)),
          depth: branch.level,
        })
      }
      continue
    }

    const angles = childAngles(genome, branch)
    angles.forEach((angle, childIndex) => {
      const childId = `${branch.id}/${childIndex}`
      const lengthVariation = randomBetween(genome.seed, `${childId}/length`, 0.84, 1.08)
      queue.push({
        id: childId,
        x: endX,
        y: endY,
        angle,
        length: branch.length * genome.architecture.taper * lengthVariation,
        width: branch.width * genome.architecture.taper * 0.88,
        level: branch.level + 1,
      })
    })
  }

  return { branches, leaves, blooms }
}
