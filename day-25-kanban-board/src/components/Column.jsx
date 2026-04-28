/* ═══════════════════════════════════════════════════════
   Column — header (title, count, collapse) + card list
   ═══════════════════════════════════════════════════════ */
import useKanbanStore from '../store/useKanbanStore'
import Card from './Card'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'

export default function Column({ column }) {
  const cards = useKanbanStore(s =>
    s.cards
      .filter(c => c.columnId === column.id)
      .sort((a, b) => a.order - b.order)
  )

  return (
    <div className={`column ${column.collapsed ? 'column--collapsed' : ''}`}>
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
        <div className="column-cards">
          {cards.map(card => (
            <Card key={card.id} card={card} />
          ))}

          {cards.length === 0 && (
            <div className="column-empty">
              <span>No cards yet</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
