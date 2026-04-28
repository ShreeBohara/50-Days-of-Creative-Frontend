/* ═══════════════════════════════════════════════════════
   CardModal — full card editing in a glassmorphism modal
   ═══════════════════════════════════════════════════════ */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useKanbanStore, { LABELS, PRIORITIES } from '../store/useKanbanStore'
import {
  X, Trash2, Calendar, CheckCircle2,
  AlertTriangle, Plus, Tag, Flag
} from 'lucide-react'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
}

export default function CardModal({ card, onClose }) {
  const updateCard = useKanbanStore(s => s.updateCard)
  const deleteCard = useKanbanStore(s => s.deleteCard)

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [label, setLabel] = useState(card.label)
  const [priority, setPriority] = useState(card.priority)
  const [dueDate, setDueDate] = useState(card.dueDate || '')
  const [subtasks, setSubtasks] = useState(card.subtasks || { total: 0, done: 0 })
  const [newSubtask, setNewSubtask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    updateCard(card.id, {
      title: title.trim() || card.title,
      description,
      label,
      priority,
      dueDate: dueDate || null,
      subtasks,
    })
    onClose()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteCard(card.id)
    onClose()
  }

  const toggleSubtask = (delta) => {
    const newDone = Math.max(0, Math.min(subtasks.total, subtasks.done + delta))
    setSubtasks({ ...subtasks, done: newDone })
  }

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks({ total: subtasks.total + 1, done: subtasks.done })
      setNewSubtask('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  const subtaskPct = subtasks.total > 0
    ? Math.round((subtasks.done / subtasks.total) * 100)
    : 0

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
        onKeyDown={handleKeyDown}
      >
        <motion.div
          className="modal-card"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <input
              type="text"
              className="modal-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Card title…"
            />
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Description */}
            <div className="modal-section">
              <label className="modal-label">Description</label>
              <textarea
                className="modal-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description…"
                rows={3}
              />
            </div>

            {/* Label */}
            <div className="modal-section">
              <label className="modal-label">
                <Tag size={12} /> Label
              </label>
              <div className="modal-labels">
                {LABELS.map(l => (
                  <button
                    key={l.id}
                    className={`label-dot ${label === l.id ? 'label-dot--active' : ''}`}
                    style={{ '--dot-color': l.color }}
                    onClick={() => setLabel(label === l.id ? null : l.id)}
                  />
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="modal-section">
              <label className="modal-label">
                <Flag size={12} /> Priority
              </label>
              <div className="modal-priorities">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    className={`priority-pill ${priority === p.id ? 'priority-pill--active' : ''}`}
                    style={{ '--pill-color': p.color }}
                    onClick={() => setPriority(p.id)}
                  >
                    <AlertTriangle size={10} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="modal-section">
              <label className="modal-label">
                <Calendar size={12} /> Due Date
              </label>
              <input
                type="date"
                className="modal-date-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* Subtasks */}
            <div className="modal-section">
              <label className="modal-label">
                <CheckCircle2 size={12} /> Subtasks ({subtasks.done}/{subtasks.total})
              </label>
              {subtasks.total > 0 && (
                <div className="modal-subtask-bar">
                  <div className="subtask-bar-bg" style={{ height: '6px' }}>
                    <div className="subtask-bar-fill" style={{ width: `${subtaskPct}%` }} />
                  </div>
                  <div className="modal-subtask-controls">
                    <button
                      className="subtask-btn"
                      onClick={() => toggleSubtask(-1)}
                      disabled={subtasks.done <= 0}
                    >
                      −
                    </button>
                    <span className="subtask-count">{subtasks.done}/{subtasks.total}</span>
                    <button
                      className="subtask-btn"
                      onClick={() => toggleSubtask(1)}
                      disabled={subtasks.done >= subtasks.total}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <div className="modal-add-subtask">
                <input
                  type="text"
                  className="modal-subtask-input"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  placeholder="Add subtask…"
                  onKeyDown={e => e.key === 'Enter' && addSubtask()}
                />
                <button className="subtask-add-btn" onClick={addSubtask}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              className={`btn-delete ${confirmDelete ? 'btn-delete--confirm' : ''}`}
              onClick={handleDelete}
            >
              <Trash2 size={14} />
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
            <button className="btn-save" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
