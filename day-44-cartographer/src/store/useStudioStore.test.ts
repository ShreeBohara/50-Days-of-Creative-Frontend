import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultParams } from '../domain/defaults'
import { DEFAULT_VIEW, useStudioStore } from './useStudioStore'

const reset = () =>
  useStudioStore.setState({
    params: createDefaultParams(),
    view: { ...DEFAULT_VIEW },
    drawKey: 0,
    activePresetId: null,
    past: [],
    future: [],
    lastTag: null,
    lastTs: 0,
  })

describe('useStudioStore', () => {
  beforeEach(reset)

  it('starts from the default world', () => {
    expect(useStudioStore.getState().params).toEqual(createDefaultParams())
  })

  it('edits a gene live without replaying the draw', () => {
    const before = useStudioStore.getState().drawKey
    useStudioStore.getState().setGene('seaLevel', 0.5, 'seaLevel')
    const s = useStudioStore.getState()
    expect(s.params.seaLevel).toBe(0.5)
    expect(s.drawKey).toBe(before)
  })

  it('coalesces rapid same-tag gene edits into one undo step', () => {
    const api = useStudioStore.getState()
    api.setGene('relief', 0.1, 'relief')
    api.setGene('relief', 0.2, 'relief')
    api.setGene('relief', 0.3, 'relief')
    expect(useStudioStore.getState().past).toHaveLength(1)
  })

  it('keeps distinct undo steps for different genes', () => {
    const api = useStudioStore.getState()
    api.setGene('relief', 0.1, 'relief')
    api.setGene('islandBias', 0.2, 'islandBias')
    expect(useStudioStore.getState().past).toHaveLength(2)
  })

  it('undo and redo restore genome state', () => {
    const api = useStudioStore.getState()
    const original = api.params.seaLevel
    api.setGene('seaLevel', 0.58, 'seaLevel')
    expect(useStudioStore.getState().params.seaLevel).toBe(0.58)

    useStudioStore.getState().undo()
    expect(useStudioStore.getState().params.seaLevel).toBe(original)

    useStudioStore.getState().redo()
    expect(useStudioStore.getState().params.seaLevel).toBe(0.58)
  })

  it('setSeed swaps the world and replays the draw', () => {
    const before = useStudioStore.getState().drawKey
    useStudioStore.getState().setSeed('newland')
    const s = useStudioStore.getState()
    expect(s.params.seed).toBe('newland')
    expect(s.drawKey).toBe(before + 1)
  })

  it('randomize produces a different world and replays', () => {
    const before = useStudioStore.getState()
    before.randomize()
    const s = useStudioStore.getState()
    expect(s.drawKey).toBe(before.drawKey + 1)
    expect(s.params.seed).not.toBe(createDefaultParams().seed)
  })

  it('reset restores the default world', () => {
    const api = useStudioStore.getState()
    api.setGene('seaLevel', 0.6, 'seaLevel')
    useStudioStore.getState().reset()
    expect(useStudioStore.getState().params).toEqual(createDefaultParams())
  })

  it('setView toggles render-only options without history', () => {
    useStudioStore.getState().setView({ rivers: false })
    const s = useStudioStore.getState()
    expect(s.view.rivers).toBe(false)
    expect(s.past).toHaveLength(0)
  })

  it('replay only bumps the draw key', () => {
    const before = useStudioStore.getState().drawKey
    const params = useStudioStore.getState().params
    useStudioStore.getState().replay()
    const s = useStudioStore.getState()
    expect(s.drawKey).toBe(before + 1)
    expect(s.params).toBe(params)
  })
})
