import { create } from 'zustand'
import { DEFAULT_STYLE } from '../data/whiteboardConfig'
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

export const useWhiteboardStore = create((set, get) => ({
  activeTool: 'select',
  elements: [],
  selectedIds: [],
  style: DEFAULT_STYLE,
  viewport: DEFAULT_VIEWPORT,
  showGrid: true,
  remoteCursors: {},
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
    set((state) => ({
      elements: [...state.elements, element],
      selectedIds: [element.id],
    }))
  },

  updateElement: (id, updater) => {
    set((state) => ({
      elements: updateElementById(state.elements, id, updater),
    }))
  },

  setElements: (elements) => {
    set({ elements, selectedIds: [] })
  },

  removeElements: (ids) => {
    const idSet = new Set(ids)

    set((state) => ({
      elements: state.elements.filter((element) => !idSet.has(element.id)),
      selectedIds: state.selectedIds.filter((id) => !idSet.has(id)),
    }))
  },

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),

  resetBoard: () => {
    set({
      elements: [],
      selectedIds: [],
      viewport: DEFAULT_VIEWPORT,
      error: '',
    })
  },

  getSelectedElements: () => {
    const selected = new Set(get().selectedIds)
    return get().elements.filter((element) => selected.has(element.id))
  },
}))
