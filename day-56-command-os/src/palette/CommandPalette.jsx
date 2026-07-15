import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'

/**
 * The palette shell: a portalled backdrop + centered panel with a query input.
 * Mounts on open, plays a scale+fade in, and stays mounted through the close
 * animation before unmounting. Grouped results are layered on in later commits.
 */
export default function CommandPalette({ open, onClose }) {
  const [render, setRender] = useState(open)
  const [state, setState] = useState(open ? 'open' : 'closed')
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Mount → next frame flip to "open" so the entry transition runs; on close,
  // switch to "closed" and unmount once the fade finishes.
  useEffect(() => {
    if (open) {
      setRender(true)
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setState('open')),
      )
      return () => cancelAnimationFrame(id)
    }
    setState('closed')
  }, [open])

  // Reset the query each time it opens, and focus the input.
  useEffect(() => {
    if (state === 'open') {
      setQuery('')
      inputRef.current?.focus()
    }
  }, [state])

  const handleScrimTransitionEnd = (e) => {
    if (e.target === e.currentTarget && state === 'closed') setRender(false)
  }

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose],
  )

  if (!render) return null

  return createPortal(
    <div
      className="cmd-scrim"
      data-state={state}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onTransitionEnd={handleScrimTransitionEnd}
    >
      <div
        className="cmd-panel"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        ref={panelRef}
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
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="cmd-body">
          <p className="cmd-hint">Type to search — grouped commands arrive next.</p>
        </div>

        <div className="cmd-foot">
          <span className="cmd-foot-item"><span className="kbd">↑↓</span> navigate</span>
          <span className="cmd-foot-item"><span className="kbd">↵</span> select</span>
          <span className="cmd-foot-item"><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
