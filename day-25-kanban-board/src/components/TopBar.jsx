/* ═══════════════════════════════════════════════════════
   TopBar — search, filters, add column (stubs for now)
   ═══════════════════════════════════════════════════════ */
import { LayoutGrid, Search, Plus } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          <LayoutGrid size={20} />
          <span className="topbar-title">Kanban Board</span>
        </div>
      </div>

      <div className="topbar-center">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search cards…"
            className="search-input"
            id="kanban-search"
          />
        </div>
      </div>

      <div className="topbar-right">
        <button className="btn-add-column" id="btn-add-column">
          <Plus size={16} />
          <span>Add Column</span>
        </button>
      </div>
    </header>
  )
}
