/* ═══════════════════════════════════════════════════════
   Column — header (title, count, collapse) + card list
   With drag-and-drop, inline header editing, collapse.
   ═══════════════════════════════════════════════════════ */
import { useRef, useCallback, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useKanbanStore from '../store/useKanbanStore'
import Card from './Card'
import AddCardForm from './AddCardForm'
import { useDrag } from './DragContext'
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'

export default function Column({ column, onCardClick, searchQuery, filters }) {
  const cards = useKanbanStore(s =>
    s.cards
      .filter(c => c.columnId === column.id)
      .sort((a, b) => a.order - b.order)
  )
  const toggleCollapse = useKanbanStore(s => s.toggleCollapseColumn)
  const updateTitle = useKanbanStore(s => s.updateColumnTitle)
  const deleteColumn = useKanbanStore(s => s.deleteColumn)
  const { draggedCard, overColumn, dropIndex, updateOver } = useDrag()
  const cardsRef = useRef(null)

  /* ---- Inline column title editing ---- */
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(column.title)
  const titleInputRef = useRef(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  const commitTitle = () => {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== column.title) {
      updateTitle(column.id, trimmed)
    }
    setEditingTitle(false)
  }

  /* Determine drop index based on pointer Y within this column */
  const handlePointerMove = useCallback((e) => {
    if (!draggedCard) return
    if (!cardsRef.current) return

    const cardEls = Array.from(cardsRef.current.querySelectorAll('.kanban-card'))
    const pointerY = e.clientY
    let idx = cardEls.length

    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (pointerY < midY) {
        idx = i
        break
      }
    }

    if (draggedCard.columnId === column.id) {
      const draggedIdx = cards.findIndex(c => c.id === draggedCard.id)
      if (draggedIdx !== -1 && idx > draggedIdx) {
        idx = Math.max(0, idx - 1)
      }
    }

    updateOver(column.id, idx, pointerY)
  }, [draggedCard, column.id, cards, updateOver])

  const isDropTarget = draggedCard && overColumn === column.id

  /* Compute whether filtering is active */
  const isFiltering = searchQuery || filters?.labels?.length > 0 || filters?.priorities?.length > 0

  const cardMatches = (card) => {
    if (!isFiltering) return true
    if (searchQuery && !card.title.toLowerCase().includes(searchQuery)) return false
    if (filters?.labels?.length > 0 && !filters.labels.includes(card.label)) return false
    if (filters?.priorities?.length > 0 && !filters.priorities.includes(card.priority)) return false
    return true
  }

  return (
    <div
      className={`column ${column.collapsed ? 'column--collapsed' : ''} ${isDropTarget ? 'column--drop-target' : ''}`}
      onPointerMove={handlePointerMove}
    >
      {/* Header */}
      <div className="column-header">
        <div className="column-header-left">
          <button
            className="collapse-btn"
            aria-label="Toggle collapse"
            onClick={() => toggleCollapse(column.id)}
          >
            {column.collapsed
              ? <ChevronRight size={16} />
              : <ChevronDown size={16} />
            }
          </button>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="column-title-input"
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(column.title) }
              }}
            />
          ) : (
            <h2
              className="column-title"
              onDoubleClick={() => { setTitleValue(column.title); setEditingTitle(true) }}
            >
              {column.title}
            </h2>
          )}

          <span className="column-count">{cards.length}</span>
        </div>

        <div className="column-header-right" style={{ position: 'relative' }}>
          <button
            className="column-menu-btn"
            aria-label="Column options"
            onClick={() => setShowMenu(!showMenu)}
            style={{ opacity: 1 }}
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="column-context-menu">
              <button
                className="context-menu-item context-menu-item--danger"
                onClick={() => { deleteColumn(column.id); setShowMenu(false) }}
                disabled={cards.length > 0}
              >
                <Trash2 size={12} />
                {cards.length > 0 ? 'Remove cards first' : 'Delete column'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list */}
      {!column.collapsed && (
        <div className="column-cards" ref={cardsRef}>
          <AnimatePresence mode="popLayout">
            {cards.map((card, i) => (
              <div key={card.id} className="card-slot">
                {isDropTarget && dropIndex === i && (
                  <motion.div
                    className="drop-indicator"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
                <Card
                  card={card}
                  onCardClick={onCardClick}
                  isMatched={cardMatches(card)}
                  isFiltering={isFiltering}
                  searchQuery={searchQuery}
                />
              </div>
            ))}
          </AnimatePresence>

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

          <AddCardForm columnId={column.id} />
        </div>
      )}
    </div>
  )
}
