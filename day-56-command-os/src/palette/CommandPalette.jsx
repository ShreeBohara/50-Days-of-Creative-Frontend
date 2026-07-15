import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'
import ResultList, { LoadingRows } from './ResultList.jsx'
import { rankCommands } from './fuzzy.js'
import { indexCommands } from './useCommandRegistry.js'
import { loadRecents, pushRecent } from './recents.js'

const NO_RESULTS = [] // stable empty reference so memos don't churn

/**
 * The palette: a portalled backdrop + panel, fuzzy-filtered grouped results,
 * nested pages, and full keyboard control (↑↓ move, Enter run/open, ⌘+number
 * jump to group, Backspace-on-empty pop a page, ESC/backdrop close). It stays
 * mounted and animates from `data-state`, so open/close never depend on
 * requestAnimationFrame (which throttles in background tabs).
 */
export default function CommandPalette({ open, onClose, groups, onPreview }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [path, setPath] = useState([]) // stack of nested panels
  const [loading, setLoading] = useState(false) // async panel "fetch"
  const inputRef = useRef(null)
  const restoreFocusRef = useRef(null)

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

  // Recents: on the root page with an empty query, prepend the last-run
  // commands. Read fresh from storage (cheap) so a command run just before is
  // reflected on the next open; resolved to live handlers, stale ids dropped.
  const commandIndex = useMemo(() => indexCommands(groups), [groups])
  const recentResults =
    !activePanel && !query.trim()
      ? loadRecents()
          .map((r) => commandIndex.get(r.id))
          .filter(Boolean)
          .map((item) => ({ item: { ...item, id: `recent:${item.id}` }, indices: [] }))
      : NO_RESULTS

  const displayGroups = useMemo(
    () =>
      recentResults.length
        ? [{ id: 'recent', label: 'Recent', results: recentResults }, ...filtered]
        : filtered,
    [recentResults, filtered],
  )

  const isLoading = !!activePanel?.async && loading

  const flat = useMemo(
    () => (isLoading ? NO_RESULTS : displayGroups.flatMap((g) => g.results.map((r) => ({ item: r.item })))),
    [displayGroups, isLoading],
  )

  // Active row is derived: honour the selection while it's a valid result,
  // otherwise fall back to the top row.
  const activeId = flat.some((f) => f.item.id === selectedId)
    ? selectedId
    : flat[0]?.item.id ?? null
  const activeIndex = flat.findIndex((f) => f.item.id === activeId)
  const activeItem = flat.find((f) => f.item.id === activeId)?.item

  // Focus the input on open; restore focus to the opener (search button/⌘K) on
  // close so keyboard users aren't dropped at the top of the page.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement
      inputRef.current?.focus()
    } else {
      restoreFocusRef.current?.focus?.()
    }
  }, [open])

  // Live-preview the active row's theme/accent while open; clear otherwise.
  // (onPreview is a parent callback, so this "sync external system" effect is
  // the right place for it.)
  useEffect(() => {
    onPreview(open ? activeItem?.preview ?? null : null)
  }, [open, activeItem, onPreview])

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

  // Enter/click a row: push its nested page, or run it and close. Root-level
  // commands are recorded as recents (base id, not the recent: clone id).
  const activate = useCallback(
    (item) => {
      if (item.panel) {
        setQuery('')
        setPath((p) => [...p, item.panel])
        // "Fetch" async panels: show a shimmer for a beat before results land.
        if (item.panel.async) {
          setLoading(true)
          window.setTimeout(() => setLoading(false), 420)
        }
        return
      }
      if (path.length === 0) {
        const baseId = item.id.startsWith('recent:') ? item.id.slice('recent:'.length) : item.id
        pushRecent({ id: baseId, label: item.label, icon: item.icon })
      }
      item.run()
      close()
    },
    [close, path.length],
  )

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      // Trap Tab: keep focus on the input (arrows drive selection).
      if (e.key === 'Tab') {
        e.preventDefault()
        inputRef.current?.focus()
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
        const g = displayGroups[Number(e.key) - 1]
        if (g) {
          e.preventDefault()
          setSelectedId(g.results[0].item.id)
        }
      }
    },
    [flat, activeIndex, displayGroups, query, path.length, close, popPage, activate],
  )

  const state = open ? 'open' : 'closed'
  const hasResults = flat.length > 0
  const fallbackCommand = commandIndex.get('create-document')

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
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-listbox"
            aria-activedescendant={!isLoading && activeId ? `cmdrow-${activeId}` : undefined}
            tabIndex={open ? 0 : -1}
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="cmd-body">
          {isLoading ? (
            <LoadingRows groups={activePanel.groups} />
          ) : hasResults ? (
            <ResultList
              groups={displayGroups}
              activeId={activeId}
              onHoverItem={setSelectedId}
              onRunItem={activate}
            />
          ) : (
            <div className="cmd-empty">
              <span className="cmd-empty-icon"><Icon name="search" /></span>
              <p>No results for <b>“{query}”</b></p>
              {fallbackCommand && (
                <button type="button" className="cmd-empty-action" onClick={() => activate(fallbackCommand)}>
                  <Icon name="plus" /> Create a document instead
                </button>
              )}
            </div>
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
