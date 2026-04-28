/* ═══════════════════════════════════════════════════════
   Card — kanban card with label, priority, avatar, etc.
   Now with Framer Motion drag support.
   ═══════════════════════════════════════════════════════ */
import { motion } from 'framer-motion'
import { LABELS, PRIORITIES } from '../store/useKanbanStore'
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

export default function Card({ card }) {
  const { draggedCard, startDrag, endDrag, cancelDrag } = useDrag()
  const labelObj = LABELS.find(l => l.id === card.label)
  const subtaskPct = card.subtasks?.total > 0
    ? Math.round((card.subtasks.done / card.subtasks.total) * 100)
    : null

  const isDragging = draggedCard?.id === card.id

  return (
    <motion.div
      className={`kanban-card ${isDragging ? 'kanban-card--dragging' : ''}`}
      id={`card-${card.id}`}
      layout
      layoutId={card.id}
      drag
      dragSnapToOrigin
      dragElastic={0.1}
      whileDrag={{
        scale: 1.04,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 999,
        cursor: 'grabbing',
      }}
      onDragStart={() => startDrag(card)}
      onDragEnd={() => endDrag()}
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
        {/* Title */}
        <h3 className="card-title">{card.title}</h3>

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
