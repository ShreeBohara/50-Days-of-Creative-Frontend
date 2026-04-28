/* ═══════════════════════════════════════════════════════
   Board — horizontal scroll container for columns
   ═══════════════════════════════════════════════════════ */
import useKanbanStore from '../store/useKanbanStore'
import Column from './Column'

export default function Board() {
  const columns = useKanbanStore(s => s.columns)

  return (
    <div className="board">
      <div className="board-scroll">
        {columns.map(col => (
          <Column key={col.id} column={col} />
        ))}
      </div>
    </div>
  )
}
