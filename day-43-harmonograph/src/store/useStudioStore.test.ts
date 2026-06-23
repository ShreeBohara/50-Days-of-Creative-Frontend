import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultParams } from '../domain/defaults'
import { useStudioStore } from './useStudioStore'

const reset = () =>
  useStudioStore.setState({
    params: createDefaultParams(),
    paletteId: 'brass-verdigris',
    lineWidth: 2.4,
    glow: 1,
    drawKey: 0,
    past: [],
    future: [],
    lastTag: null,
    lastTs: 0,
  })

describe('useStudioStore', () => {
  beforeEach(reset)

  it('starts from the default figure', () => {
    expect(useStudioStore.getState().params).toEqual(createDefaultParams())
  })

  it('edits a pendulum field without replaying the draw', () => {
    const before = useStudioStore.getState().drawKey
    useStudioStore.getState().setPendulum('x', 0, { freq: 5 }, 'x0.freq')
    const s = useStudioStore.getState()
    expect(s.params.x[0].freq).toBe(5)
    expect(s.drawKey).toBe(before) // live edit, no animation
  })

  it('coalesces rapid same-tag edits into one undo step', () => {
    const api = useStudioStore.getState()
    api.setPendulum('x', 0, { freq: 3 }, 'x0.freq')
    api.setPendulum('x', 0, { freq: 4 }, 'x0.freq')
    api.setPendulum('x', 0, { freq: 5 }, 'x0.freq')
    expect(useStudioStore.getState().past).toHaveLength(1)
  })

  it('keeps distinct undo steps for different fields', () => {
    const api = useStudioStore.getState()
    api.setPendulum('x', 0, { freq: 3 }, 'x0.freq')
    api.setPendulum('y', 1, { amp: 0.2 }, 'y1.amp')
    expect(useStudioStore.getState().past).toHaveLength(2)
  })

  it('undo and redo restore figure state', () => {
    const api = useStudioStore.getState()
    const original = api.params.x[0].freq
    api.setPendulum('x', 0, { freq: 7 }, 'x0.freq')
    expect(useStudioStore.getState().params.x[0].freq).toBe(7)

    useStudioStore.getState().undo()
    expect(useStudioStore.getState().params.x[0].freq).toBe(original)

    useStudioStore.getState().redo()
    expect(useStudioStore.getState().params.x[0].freq).toBe(7)
  })

  it('loadParams swaps the figure and replays the draw', () => {
    const before = useStudioStore.getState().drawKey
    const next = { ...createDefaultParams(), seed: 'swapped', duration: 99 }
    useStudioStore.getState().loadParams(next)
    const s = useStudioStore.getState()
    expect(s.params.seed).toBe('swapped')
    expect(s.drawKey).toBe(before + 1)
  })

  it('reset restores the default figure', () => {
    const api = useStudioStore.getState()
    api.setPendulum('x', 0, { freq: 8 }, 'x0.freq')
    useStudioStore.getState().reset()
    expect(useStudioStore.getState().params).toEqual(createDefaultParams())
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
