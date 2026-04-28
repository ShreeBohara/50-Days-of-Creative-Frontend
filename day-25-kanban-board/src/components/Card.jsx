/* ═══════════════════════════════════════════════════════
   Card — kanban card with label, priority, avatar, etc.
   Framer Motion drag + inline title editing.
   ═══════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LABELS, PRIORITIES } from '../store/useKanbanStore'
import useKanbanStore from '../store/useKanbanStore'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { useDrag } from './DragContext'

/* Priority icon mapping */
const PriorityIcon = ({ priority }) => {
  const p = PRIORITIES.find(pr => pr.id === priority)
  if (!p) return null
  return (
    <span className="priority-badge" style={{ '--priority-color': p.color }}>
      <AlertTriangle size={10} />
      <span>{p.label}</span>
    </span>
  )
}

/* Highlight search text in title */
function HighlightedTitle({ text, query }) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function Card({ card, onCardClick, isMatched = true, isFiltering = false, searchQuery = '' }) {
  const { draggedCard, startDrag, endDrag } = useDrag()
  const updateCard = useKanbanStore(s => s.updateCard)
  const labelObj = LABELS.find(l => l.id === card.label)
  const subtaskPct = card.subtasks?.total > 0
    ? Math.round((card.subtasks.done / card.subtasks.total) * 100)
    : null

  const isDragging = draggedCard?.id === card.id
  const wasDraggedRef = useRef(false)

  /* ---- Inline title editing ---- */
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(card.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = (e) => {
    e.stopPropagation()
    setEditValue(card.title)
    setEditing(true)
  }

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== card.title) {
      updateCard(card.id, { title: trimmed })
    }
    setEditing(false)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setEditValue(card.title)
    }
  }

  return (
    <motion.div
      className={`kanban-card ${isDragging ? 'kanban-card--dragging' : ''} ${isFiltering && !isMatched ? 'kanban-card--dimmed' : ''}`}
      id={`card-${card.id}`}
      layout
      layoutId={card.id}
      drag={!editing}
      dragSnapToOrigin
      dragElastic={0.1}
      whileDrag={{
        scale: 1.04,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 999,
        cursor: 'grabbing',
      }}
      onDragStart={() => { wasDraggedRef.current = true; startDrag(card) }}
      onDragEnd={() => { endDrag(); setTimeout(() => { wasDraggedRef.current = false }, 100) }}
      onClick={() => {
        if (!editing && !wasDraggedRef.current && onCardClick) {
          onCardClick(card)
        }
      }}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 30 },
      }}
      style={{ position: 'relative', zIndex: isDragging ? 999 : 'auto' }}
    >
      {/* Label strip */}
      {labelObj && (
        <div className="card-label-strip" style={{ background: labelObj.color }} />
      )}

      <div className="card-body">
        {/* Title — double-click to edit */}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            className="card-title-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
          />
        ) : (
          <h3 className="card-title" onDoubleClick={startEdit}>
            <HighlightedTitle text={card.title} query={searchQuery} />
          </h3>
        )}

        {/* Description */}
        {card.description && (
          <p className="card-description">{card.description}</p>
        )}

        {/* Subtask progress */}
        {subtaskPct !== null && (
          <div className="card-subtasks">
            <div className="subtask-bar-bg">
              <div
                className="subtask-bar-fill"
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
            <span className="subtask-label">
              <CheckCircle2 size={10} />
              {card.subtasks.done}/{card.subtasks.total}
            </span>
          </div>
        )}

        {/* Footer row: priority + due date + avatar */}
        <div className="card-footer">
          <div className="card-footer-left">
            <PriorityIcon priority={card.priority} />
            {card.dueDate && (
              <span className="card-due">
                <Clock size={10} />
                {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div
            className="card-avatar"
            style={{ background: card.avatar }}
            title="Assigned"
          />
        </div>
      </div>
    </motion.div>
  )
}
