/* ═══════════════════════════════════════════════════════
   Column — header (title, count, collapse) + card list
   With drag-and-drop zone detection.
   ═══════════════════════════════════════════════════════ */
import { useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useKanbanStore from '../store/useKanbanStore'
import Card from './Card'
import AddCardForm from './AddCardForm'
import { useDrag } from './DragContext'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'

export default function Column({ column }) {
  const cards = useKanbanStore(s =>
    s.cards
      .filter(c => c.columnId === column.id)
      .sort((a, b) => a.order - b.order)
  )
  const { draggedCard, overColumn, dropIndex, updateOver } = useDrag()
  const cardsRef = useRef(null)

  /* Determine drop index based on pointer Y within this column */
  const handlePointerMove = useCallback((e) => {
    if (!draggedCard) return
    if (!cardsRef.current) return

    const cardEls = Array.from(cardsRef.current.querySelectorAll('.kanban-card'))
    const pointerY = e.clientY
    let idx = cardEls.length // default: append to end

    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (pointerY < midY) {
        idx = i
        break
      }
    }

    /* If dragging within same column, adjust index for the gap left by the dragged card */
    if (draggedCard.columnId === column.id) {
      const draggedIdx = cards.findIndex(c => c.id === draggedCard.id)
      if (draggedIdx !== -1 && idx > draggedIdx) {
        idx = Math.max(0, idx - 1)
      }
    }

    updateOver(column.id, idx, pointerY)
  }, [draggedCard, column.id, cards, updateOver])

  const isDropTarget = draggedCard && overColumn === column.id

  return (
    <div
      className={`column ${column.collapsed ? 'column--collapsed' : ''} ${isDropTarget ? 'column--drop-target' : ''}`}
      onPointerMove={handlePointerMove}
    >
      {/* Header */}
      <div className="column-header">
        <div className="column-header-left">
          <button className="collapse-btn" aria-label="Toggle collapse">
            {column.collapsed
              ? <ChevronRight size={16} />
              : <ChevronDown size={16} />
            }
          </button>
          <h2 className="column-title">{column.title}</h2>
          <span className="column-count">{cards.length}</span>
        </div>
        <button className="column-menu-btn" aria-label="Column options">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Card list */}
      {!column.collapsed && (
        <div className="column-cards" ref={cardsRef}>
          <AnimatePresence mode="popLayout">
            {cards.map((card, i) => (
              <div key={card.id} className="card-slot">
                {/* Drop indicator line */}
                {isDropTarget && dropIndex === i && (
                  <motion.div
                    className="drop-indicator"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
                <Card card={card} />
              </div>
            ))}
          </AnimatePresence>

          {/* Drop indicator at end */}
          {isDropTarget && dropIndex >= cards.length && (
            <motion.div
              className="drop-indicator"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}

          {cards.length === 0 && !isDropTarget && (
            <div className="column-empty">
              <span>No cards yet</span>
            </div>
          )}

          {cards.length === 0 && isDropTarget && (
            <div className="column-drop-empty">
              <span>Drop here</span>
            </div>
          )}

          {/* Add card form */}
          <AddCardForm columnId={column.id} />
        </div>
      )}
    </div>
  )
}

