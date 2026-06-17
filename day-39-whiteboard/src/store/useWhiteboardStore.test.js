import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_STYLE } from '../data/whiteboardConfig'
import { createShapeElement } from '../utils/elements'
import { useWhiteboardStore } from './useWhiteboardStore'

function resetStore() {
  useWhiteboardStore.setState({
    elements: [],
    selectedIds: [],
    historyPast: [],
    historyFuture: [],
    viewport: { x: 0, y: 0, scale: 1 },
  })
}

describe('whiteboard store', () => {
  afterEach(resetStore)

  it('undoes and redoes element additions', () => {
    const element = createShapeElement('rectangle', { x: 0, y: 0 }, { x: 30, y: 30 }, DEFAULT_STYLE, 1)

    useWhiteboardStore.getState().addElement(element)
    expect(useWhiteboardStore.getState().elements).toHaveLength(1)

    useWhiteboardStore.getState().undo()
    expect(useWhiteboardStore.getState().elements).toHaveLength(0)

    useWhiteboardStore.getState().redo()
    expect(useWhiteboardStore.getState().elements).toHaveLength(1)
  })

  it('moves selected elements and changes layer order', () => {
    const first = createShapeElement('rectangle', { x: 0, y: 0 }, { x: 30, y: 30 }, DEFAULT_STYLE, 1)
    const second = createShapeElement('ellipse', { x: 40, y: 40 }, { x: 80, y: 80 }, DEFAULT_STYLE, 2)

    useWhiteboardStore.setState({ elements: [first, second], selectedIds: [first.id] })
    useWhiteboardStore.getState().moveSelected({ x: 10, y: 20 })
    useWhiteboardStore.getState().bringForward()

    const moved = useWhiteboardStore.getState().elements.find((element) => element.id === first.id)
    expect(moved.x).toBe(10)
    expect(moved.y).toBe(20)
    expect(moved.zIndex).toBe(2)
  })
})
