/* ═══════════════════════════════════════════════════════
   AddCardForm — inline form to create new cards
   Slides open in column footer with AnimatePresence.
   ═══════════════════════════════════════════════════════ */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useKanbanStore, { LABELS, PRIORITIES } from '../store/useKanbanStore'
import { Plus, X } from 'lucide-react'

export default function AddCardForm({ columnId }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState(null)
  const [priority, setPriority] = useState('medium')
  const addCard = useKanbanStore(s => s.addCard)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addCard(columnId, { title: title.trim(), label, priority })
    setTitle('')
    setLabel(null)
    setPriority('medium')
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setTitle('')
    }
  }

  return (
    <div className="add-card-wrapper">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            className="add-card-trigger"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Plus size={14} />
            <span>Add card</span>
          </motion.button>
        ) : (
          <motion.form
            key="form"
            className="add-card-form"
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              type="text"
              className="add-card-input"
              placeholder="Card title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />

            {/* Label selector */}
            <div className="add-card-labels">
              {LABELS.map(l => (
                <button
                  key={l.id}
                  type="button"
                  className={`label-dot ${label === l.id ? 'label-dot--active' : ''}`}
                  style={{ '--dot-color': l.color }}
                  onClick={() => setLabel(label === l.id ? null : l.id)}
                  aria-label={`Label ${l.id}`}
                />
              ))}
            </div>

            {/* Priority selector */}
            <div className="add-card-priorities">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`priority-pill ${priority === p.id ? 'priority-pill--active' : ''}`}
                  style={{ '--pill-color': p.color }}
                  onClick={() => setPriority(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="add-card-actions">
              <button type="submit" className="btn-add" disabled={!title.trim()}>
                Add
              </button>
              <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
