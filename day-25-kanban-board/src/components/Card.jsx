/* ═══════════════════════════════════════════════════════
   Card — kanban card with label, priority, avatar, etc.
   ═══════════════════════════════════════════════════════ */
import { LABELS, PRIORITIES } from '../store/useKanbanStore'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

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
  const labelObj = LABELS.find(l => l.id === card.label)
  const subtaskPct = card.subtasks?.total > 0
    ? Math.round((card.subtasks.done / card.subtasks.total) * 100)
    : null

  return (
    <div className="kanban-card" id={`card-${card.id}`}>
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
    </div>
  )
}
