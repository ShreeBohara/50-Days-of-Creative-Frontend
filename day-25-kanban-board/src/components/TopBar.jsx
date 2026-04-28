/* ═══════════════════════════════════════════════════════
   TopBar — search, label/priority filters, add column
   ═══════════════════════════════════════════════════════ */
import { useState, useCallback } from 'react'
import { LayoutGrid, Search, Plus, X, Filter } from 'lucide-react'
import useKanbanStore, { LABELS, PRIORITIES } from '../store/useKanbanStore'

export default function TopBar({ onSearch, filters, onFilterChange }) {
  const [searchValue, setSearchValue] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const addColumn = useKanbanStore(s => s.addColumn)

  const handleAddColumn = () => {
    if (newColTitle.trim()) {
      addColumn(newColTitle.trim())
      setNewColTitle('')
      setShowAddCol(false)
    }
  }

  const handleSearch = useCallback((e) => {
    const val = e.target.value
    setSearchValue(val)
    onSearch?.(val)
  }, [onSearch])

  const toggleLabel = (labelId) => {
    const current = filters?.labels || []
    const next = current.includes(labelId)
      ? current.filter(l => l !== labelId)
      : [...current, labelId]
    onFilterChange?.({ ...filters, labels: next })
  }

  const togglePriority = (priorityId) => {
    const current = filters?.priorities || []
    const next = current.includes(priorityId)
      ? current.filter(p => p !== priorityId)
      : [...current, priorityId]
    onFilterChange?.({ ...filters, priorities: next })
  }

  const hasActiveFilters = (filters?.labels?.length > 0) || (filters?.priorities?.length > 0)

  const clearFilters = () => {
    onFilterChange?.({ labels: [], priorities: [] })
  }

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
            value={searchValue}
            onChange={handleSearch}
          />
          {searchValue && (
            <button
              className="search-clear"
              onClick={() => { setSearchValue(''); onSearch?.('') }}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <button
          className={`btn-filter ${showFilters ? 'btn-filter--active' : ''} ${hasActiveFilters ? 'btn-filter--has-filters' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} />
          <span>Filter</span>
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
        <button
          className="btn-add-column"
          id="btn-add-column"
          onClick={() => setShowAddCol(!showAddCol)}
        >
          <Plus size={16} />
          <span>Add Column</span>
        </button>

        {showAddCol && (
          <div className="add-column-popover">
            <input
              type="text"
              className="add-card-input"
              placeholder="Column name…"
              value={newColTitle}
              onChange={e => setNewColTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddColumn()
                if (e.key === 'Escape') setShowAddCol(false)
              }}
              autoFocus
            />
            <div className="add-card-actions">
              <button className="btn-add" onClick={handleAddColumn} disabled={!newColTitle.trim()}>Create</button>
              <button className="btn-cancel" onClick={() => setShowAddCol(false)}><X size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Filter panel dropdown */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-group-label">Label</span>
            <div className="filter-group-items">
              {LABELS.map(l => (
                <button
                  key={l.id}
                  className={`label-dot label-dot--filter ${filters?.labels?.includes(l.id) ? 'label-dot--active' : ''}`}
                  style={{ '--dot-color': l.color }}
                  onClick={() => toggleLabel(l.id)}
                  aria-label={`Filter by ${l.id}`}
                />
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Priority</span>
            <div className="filter-group-items">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  className={`priority-pill ${filters?.priorities?.includes(p.id) ? 'priority-pill--active' : ''}`}
                  style={{ '--pill-color': p.color }}
                  onClick={() => togglePriority(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button className="filter-clear" onClick={clearFilters}>
              <X size={12} />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </header>
  )
}
