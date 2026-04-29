/* ═══════════════════════════════════════════════════════
   Board — horizontal scroll container for columns
   ═══════════════════════════════════════════════════════ */
import { useShallow } from 'zustand/react/shallow'
import useKanbanStore from '../store/useKanbanStore'
import Column from './Column'

export default function Board({ onCardClick, searchQuery, filters }) {
  const columns = useKanbanStore(useShallow(s => s.columns))

  return (
    <div className="board">
      <div className="board-scroll">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            onCardClick={onCardClick}
            searchQuery={searchQuery}
            filters={filters}
          />
        ))}
      </div>
    </div>
  )
}
