/* ═══════════════════════════════════════════════════════
   DragContext — coordinates cross-column card dragging
   Tracks: which card is being dragged, which column is
   hovered, and the target drop index.
   ═══════════════════════════════════════════════════════ */
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import useKanbanStore from '../store/useKanbanStore'

const DragContext = createContext(null)

export function DragProvider({ children }) {
  const [draggedCard, setDraggedCard] = useState(null)   // full card object
  const [overColumn, setOverColumn] = useState(null)     // column id
  const [dropIndex, setDropIndex] = useState(0)           // insert position
  const moveCard = useKanbanStore(s => s.moveCard)
  const reorderCard = useKanbanStore(s => s.reorderCard)
  const pointerYRef = useRef(0)

  const startDrag = useCallback((card) => {
    setDraggedCard(card)
    setOverColumn(card.columnId)
  }, [])

  const updateOver = useCallback((columnId, index, pointerY) => {
    setOverColumn(columnId)
    setDropIndex(index)
    pointerYRef.current = pointerY
  }, [])

  const endDrag = useCallback(() => {
    if (draggedCard && overColumn) {
      if (overColumn === draggedCard.columnId) {
        reorderCard(draggedCard.id, dropIndex)
      } else {
        moveCard(draggedCard.id, overColumn, dropIndex)
      }
    }
    setDraggedCard(null)
    setOverColumn(null)
    setDropIndex(0)
  }, [draggedCard, overColumn, dropIndex, moveCard, reorderCard])

  const cancelDrag = useCallback(() => {
    setDraggedCard(null)
    setOverColumn(null)
    setDropIndex(0)
  }, [])

  return (
    <DragContext.Provider
      value={{
        draggedCard,
        overColumn,
        dropIndex,
        startDrag,
        updateOver,
        endDrag,
        cancelDrag,
      }}
    >
      {children}
    </DragContext.Provider>
  )
}

export function useDrag() {
  const ctx = useContext(DragContext)
  if (!ctx) throw new Error('useDrag must be used within DragProvider')
  return ctx
}
