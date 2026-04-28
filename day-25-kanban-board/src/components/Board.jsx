/* ═══════════════════════════════════════════════════════
   Board — horizontal scroll container for columns
   ═══════════════════════════════════════════════════════ */
import useKanbanStore from '../store/useKanbanStore'

export default function Board() {
  const columns = useKanbanStore(s => s.columns)

  return (
    <div className="board">
      <div className="board-scroll">
        {columns.map(col => (
          <div key={col.id} className="column-placeholder">
            <div className="column-header-placeholder">
              <span className="column-title-text">{col.title}</span>
            </div>
            <div className="column-body-placeholder">
              <span className="placeholder-text">Cards go here</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
