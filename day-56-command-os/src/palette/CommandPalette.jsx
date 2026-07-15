import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'
import ResultList from './ResultList.jsx'
import { rankCommands } from './fuzzy.js'

/**
 * The palette: a portalled backdrop + panel, fuzzy-filtered grouped results, and
 * full keyboard control (↑↓ move, Enter run, ⌘+number jump to group, ESC/backdrop
 * close). It stays mounted and animates purely from the `data-state` attribute,
 * so open/close never depend on requestAnimationFrame (which throttles in
 * background tabs).
 */
export default function CommandPalette({ open, onClose, groups }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const inputRef = useRef(null)

  // Fuzzy-filter each group; drop empty groups.
  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, results: rankCommands(g.items, query) }))
        .filter((g) => g.results.length > 0),
    [groups, query],
  )

  // Flattened view for keyboard traversal across group boundaries.
  const flat = useMemo(
    () => filtered.flatMap((g) => g.results.map((r) => ({ item: r.item }))),
    [filtered],
  )

  // Active row is derived: honour the user's selection while it's still a valid
  // result, otherwise fall back to the top row. No effect needed to "reset" it.
  const activeId = flat.some((f) => f.item.id === selectedId)
    ? selectedId
    : flat[0]?.item.id ?? null
  const activeIndex = flat.findIndex((f) => f.item.id === activeId)

  // Focus the input whenever the palette opens (focus() is not a state update).
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Every close path clears the query so the next open starts fresh. Done in an
  // event handler (not an effect) to avoid cascading renders.
  const close = useCallback(() => {
    setQuery('')
    onClose()
  }, [onClose])

  const runItem = useCallback(
    (item) => {
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
        if (flat[activeIndex]) runItem(flat[activeIndex].item)
        return
      }
      // ⌘/Ctrl + number → jump to the first item of that group.
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        const g = filtered[Number(e.key) - 1]
        if (g) {
          e.preventDefault()
          setSelectedId(g.results[0].item.id)
        }
      }
    },
    [flat, activeIndex, filtered, close, runItem],
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
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search or run a command…"
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
              onRunItem={runItem}
            />
          ) : (
            <p className="cmd-hint">No results for “{query}”.</p>
          )}
        </div>

        <div className="cmd-foot">
          <span className="cmd-foot-item"><span className="kbd">↑↓</span> navigate</span>
          <span className="cmd-foot-item"><span className="kbd">↵</span> select</span>
          <span className="cmd-foot-item"><span className="kbd">⌘1–9</span> jump</span>
          <span className="cmd-foot-item cmd-foot-end"><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
