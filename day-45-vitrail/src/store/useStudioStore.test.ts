import { beforeEach, describe, expect, it } from 'vitest'
import { defaultGenome } from '../domain/genome'
import { useStudioStore } from './useStudioStore'

function resetStore() {
  useStudioStore.setState({
    genome: defaultGenome(),
    drawKey: 0,
    activePresetId: null,
    past: [],
    future: [],
    lastTag: null,
    lastTs: 0,
  })
}

describe('useStudioStore', () => {
  beforeEach(resetStore)

  it('setGene clamps values and records history', () => {
    useStudioStore.getState().setGene('rings', 99)
    const s = useStudioStore.getState()
    expect(s.genome.rings).toBe(6)
    expect(s.past).toHaveLength(1)
    expect(s.drawKey).toBe(0) // sliders do not replay the reveal
  })

  it('coalesces rapid same-tag slider edits into one undo step', () => {
    const { setGene } = useStudioStore.getState()
    setGene('density', 0.5, 'density')
    setGene('density', 0.6, 'density')
    setGene('density', 0.7, 'density')
    expect(useStudioStore.getState().past).toHaveLength(1)
    useStudioStore.getState().undo()
    expect(useStudioStore.getState().genome.density).toBe(defaultGenome().density)
  })

  it('setChoice swaps categorical genes and replays', () => {
    useStudioStore.getState().setChoice({ archetype: 'lancet' })
    const s = useStudioStore.getState()
    expect(s.genome.archetype).toBe('lancet')
    expect(s.drawKey).toBe(1)
  })

  it('randomize produces a fresh valid genome and bumps drawKey', () => {
    useStudioStore.getState().randomize()
    const s = useStudioStore.getState()
    expect(s.genome).not.toEqual(defaultGenome())
    expect(s.drawKey).toBe(1)
  })

  it('setSeed ignores blank input', () => {
    useStudioStore.getState().setSeed('   ')
    expect(useStudioStore.getState().genome.seed).toBe(defaultGenome().seed)
    expect(useStudioStore.getState().past).toHaveLength(0)
  })

  it('undo/redo walk the genome history across fields', () => {
    useStudioStore.getState().setChoice({ paletteId: 'ember' })
    useStudioStore.getState().setChoice({ archetype: 'lancet' })
    useStudioStore.getState().undo()
    const afterUndo = useStudioStore.getState().genome
    expect(afterUndo.paletteId).toBe('ember')
    expect(afterUndo.archetype).toBe('rose')
    useStudioStore.getState().redo()
    expect(useStudioStore.getState().genome.archetype).toBe('lancet')
  })

  it('rapid scrubbing of the same choice coalesces into one undo step', () => {
    useStudioStore.getState().setChoice({ paletteId: 'ember' })
    useStudioStore.getState().setChoice({ paletteId: 'forest' })
    expect(useStudioStore.getState().past).toHaveLength(1)
  })

  it('mutate keeps the genome valid and replays', () => {
    useStudioStore.getState().mutateCurrent(1)
    const s = useStudioStore.getState()
    expect(s.drawKey).toBe(1)
    expect(s.genome.rings).toBeGreaterThanOrEqual(2)
    expect(s.genome.rings).toBeLessThanOrEqual(6)
  })
})
