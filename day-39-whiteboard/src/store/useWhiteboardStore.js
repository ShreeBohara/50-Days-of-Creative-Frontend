import { create } from 'zustand'
import { DEFAULT_STYLE } from '../data/whiteboardConfig'
import { translateElement } from '../utils/geometry'
import { DEFAULT_VIEWPORT } from '../utils/viewport'

function updateElementById(elements, id, updater) {
  return elements.map((element) => {
    if (element.id !== id) {
      return element
    }

    return {
      ...updater(element),
      updatedAt: Date.now(),
    }
  })
}

function snapshot(state) {
  return {
    elements: state.elements,
    selectedIds: state.selectedIds,
  }
}

function withHistory(state, patch) {
  return {
    ...patch,
    historyPast: [...state.historyPast, snapshot(state)].slice(-80),
    historyFuture: [],
  }
}

export const useWhiteboardStore = create((set, get) => ({
  activeTool: 'select',
  elements: [],
  selectedIds: [],
  style: DEFAULT_STYLE,
  viewport: DEFAULT_VIEWPORT,
  showGrid: true,
  remoteCursors: {},
  historyPast: [],
  historyFuture: [],
  error: '',

  setActiveTool: (activeTool) => set({ activeTool }),
  setViewport: (viewport) => set({ viewport }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setShowGrid: (showGrid) => set({ showGrid }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: '' }),

  updateStyle: (patch) => {
    set((state) => ({
      style: {
        ...state.style,
        ...patch,
      },
    }))
  },

  addElement: (element) => {
    set((state) => withHistory(state, {
      elements: [...state.elements, element],
      selectedIds: [element.id],
    }))
  },

  updateElement: (id, updater) => {
    set((state) => withHistory(state, {
      elements: updateElementById(state.elements, id, updater),
    }))
  },

  replaceElement: (nextElement) => {
    set((state) => ({
      elements: updateElementById(state.elements, nextElement.id, () => nextElement),
    }))
  },

  setElements: (elements, record = true) => {
    set((state) => (
      record
        ? withHistory(state, { elements, selectedIds: [] })
        : { elements, selectedIds: [] }
    ))
  },

  removeElements: (ids, record = true) => {
    const idSet = new Set(ids)

    set((state) => {
      const patch = {
        elements: state.elements.filter((element) => !idSet.has(element.id)),
        selectedIds: state.selectedIds.filter((id) => !idSet.has(id)),
      }

      return record ? withHistory(state, patch) : patch
    })
  },

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),

  moveSelected: (delta) => {
    const selected = new Set(get().selectedIds)

    if (!selected.size) {
      return
    }

    set((state) => ({
      elements: state.elements.map((element) => (
        selected.has(element.id)
          ? { ...translateElement(element, delta), updatedAt: Date.now() }
          : element
      )),
    }))
  },

  deleteSelected: () => {
    get().removeElements(get().selectedIds)
  },

  bringForward: () => {
    const selected = new Set(get().selectedIds)

    set((state) => withHistory(state, {
      elements: state.elements.map((element) => (
        selected.has(element.id)
          ? { ...element, zIndex: element.zIndex + 1, updatedAt: Date.now() }
          : element
      )),
    }))
  },

  sendBackward: () => {
    const selected = new Set(get().selectedIds)

    set((state) => withHistory(state, {
      elements: state.elements.map((element) => (
        selected.has(element.id)
          ? { ...element, zIndex: Math.max(1, element.zIndex - 1), updatedAt: Date.now() }
          : element
      )),
    }))
  },

  checkpointHistory: () => {
    set((state) => withHistory(state, {}))
  },

  undo: () => {
    set((state) => {
      const previous = state.historyPast.at(-1)

      if (!previous) {
        return state
      }

      return {
        elements: previous.elements,
        selectedIds: previous.selectedIds,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [snapshot(state), ...state.historyFuture].slice(0, 80),
      }
    })
  },

  redo: () => {
    set((state) => {
      const next = state.historyFuture[0]

      if (!next) {
        return state
      }

      return {
        elements: next.elements,
        selectedIds: next.selectedIds,
        historyPast: [...state.historyPast, snapshot(state)].slice(-80),
        historyFuture: state.historyFuture.slice(1),
      }
    })
  },

  resetBoard: () => {
    set((state) => withHistory(state, {
      elements: [],
      selectedIds: [],
      viewport: DEFAULT_VIEWPORT,
      error: '',
    }))
  },

  getSelectedElements: () => {
    const selected = new Set(get().selectedIds)
    return get().elements.filter((element) => selected.has(element.id))
  },
}))
