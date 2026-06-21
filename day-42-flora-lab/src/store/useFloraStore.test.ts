import { beforeEach, describe, expect, it } from 'vitest'
import { cloneGenome, DEFAULT_GENOME } from '../domain/genome'
import { useFloraStore } from './useFloraStore'

describe('flora store history', () => {
  beforeEach(() => {
    useFloraStore.setState({
      genome: cloneGenome(DEFAULT_GENOME),
      past: [],
      future: [],
      announcement: '',
      collection: [],
      parentAId: null,
      parentBId: null,
    })
  })

  it('undoes and redoes a DNA edit', () => {
    useFloraStore.getState().setArchitecture('spread', 51)
    expect(useFloraStore.getState().genome.architecture.spread).toBe(51)
    expect(useFloraStore.getState().past).toHaveLength(1)

    useFloraStore.getState().undo()
    expect(useFloraStore.getState().genome.architecture.spread).toBe(DEFAULT_GENOME.architecture.spread)
    expect(useFloraStore.getState().future).toHaveLength(1)

    useFloraStore.getState().redo()
    expect(useFloraStore.getState().genome.architecture.spread).toBe(51)
  })

  it('clears redo history after a new edit', () => {
    useFloraStore.getState().setFoliage('shape', 'fan')
    useFloraStore.getState().undo()
    expect(useFloraStore.getState().future).toHaveLength(1)
    useFloraStore.getState().setPalette('alpine')
    expect(useFloraStore.getState().future).toHaveLength(0)
  })
})
