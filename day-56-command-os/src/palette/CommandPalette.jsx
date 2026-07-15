import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'
import ResultList from './ResultList.jsx'
import { rankCommands } from './fuzzy.js'

/**
 * The palette: a portalled backdrop + panel, fuzzy-filtered grouped results,
 * nested pages, and full keyboard control (↑↓ move, Enter run/open, ⌘+number
 * jump to group, Backspace-on-empty pop a page, ESC/backdrop close). It stays
 * mounted and animates from `data-state`, so open/close never depend on
 * requestAnimationFrame (which throttles in background tabs).
 */
export default function CommandPalette({ open, onClose, groups }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [path, setPath] = useState([]) // stack of nested panels
  const inputRef = useRef(null)

  // Root groups, or the current nested panel's groups.
  const activePanel = path[path.length - 1] ?? null
  const currentGroups = activePanel ? activePanel.groups : groups

  // Fuzzy-filter each group; drop empty groups.
  const filtered = useMemo(
    () =>
      currentGroups
        .map((g) => ({ ...g, results: rankCommands(g.items, query) }))
        .filter((g) => g.results.length > 0),
    [currentGroups, query],
  )

  const flat = useMemo(
    () => filtered.flatMap((g) => g.results.map((r) => ({ item: r.item }))),
    [filtered],
  )

  // Active row is derived: honour the selection while it's a valid result,
  // otherwise fall back to the top row.
  const activeId = flat.some((f) => f.item.id === selectedId)
    ? selectedId
    : flat[0]?.item.id ?? null
  const activeIndex = flat.findIndex((f) => f.item.id === activeId)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Close resets the page stack + query so the next open starts clean at root.
  const close = useCallback(() => {
    setQuery('')
    setPath([])
    onClose()
  }, [onClose])

  const popPage = useCallback((depth) => {
    setQuery('')
    setPath((p) => p.slice(0, depth))
  }, [])

  // Enter/click a row: push its nested page, or run it and close.
  const activate = useCallback(
    (item) => {
      if (item.panel) {
        setQuery('')
        setPath((p) => [...p, item.panel])
        return
      }
      item.run()
      close()
    },
    [close],
  )

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      // Backspace on an empty query steps back out of a nested page.
      if (e.key === 'Backspace' && query === '' && path.length) {
        e.preventDefault()
        popPage(path.length - 1)
        return
      }
      if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
        e.preventDefault()
        if (flat.length) setSelectedId(flat[(activeIndex + 1 + flat.length) % flat.length].item.id)
        return
      }
      if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault()
        if (flat.length) setSelectedId(flat[(activeIndex - 1 + flat.length) % flat.length].item.id)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (flat[activeIndex]) activate(flat[activeIndex].item)
        return
      }
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        const g = filtered[Number(e.key) - 1]
        if (g) {
          e.preventDefault()
          setSelectedId(g.results[0].item.id)
        }
      }
    },
    [flat, activeIndex, filtered, query, path.length, close, popPage, activate],
  )

  const state = open ? 'open' : 'closed'
  const hasResults = flat.length > 0

  return createPortal(
    <div
      className="cmd-scrim"
      data-state={state}
      aria-hidden={!open}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="cmd-panel"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="cmd-input-row">
          <Icon name="search" className="cmd-search-icon" />
          {path.map((page, i) => (
            <button
              key={page.id}
              type="button"
              className="cmd-crumb"
              onClick={() => popPage(i)}
              title="Back"
            >
              {page.title}
              <Icon name="chevronRight" />
            </button>
          ))}
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder={activePanel ? `${activePanel.title}…` : 'Search or run a command…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck="false"
            autoComplete="off"
            aria-label="Search commands"
            tabIndex={open ? 0 : -1}
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="cmd-body">
          {hasResults ? (
            <ResultList
              groups={filtered}
              activeId={activeId}
              onHoverItem={setSelectedId}
              onRunItem={activate}
            />
          ) : (
            <p className="cmd-hint">No results for “{query}”.</p>
          )}
        </div>

        <div className="cmd-foot">
          <span className="cmd-foot-item"><span className="kbd">↑↓</span> navigate</span>
          <span className="cmd-foot-item"><span className="kbd">↵</span> select</span>
          {path.length ? (
            <span className="cmd-foot-item"><span className="kbd">⌫</span> back</span>
          ) : (
            <span className="cmd-foot-item"><span className="kbd">⌘1–9</span> jump</span>
          )}
          <span className="cmd-foot-item cmd-foot-end"><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
