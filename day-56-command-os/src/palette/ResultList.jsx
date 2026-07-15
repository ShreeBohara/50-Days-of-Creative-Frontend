import { useEffect, useRef } from 'react'
import Icon from '../icons.jsx'
import Highlight from './Highlight.jsx'

// Skeleton rows for an "async" panel (the People/Assign page) while it "loads".
export function LoadingRows({ groups }) {
  return (
    <div className="cmd-results" aria-busy="true" aria-label="Loading">
      {groups.map((group) => (
        <div className="cmd-group" key={group.id}>
          <div className="cmd-group-head"><span>{group.label}</span></div>
          {group.items.map((_, i) => (
            <div className="cmd-row cmd-row--skeleton" key={i} aria-hidden="true">
              <span className="sk sk-avatar" />
              <span className="sk sk-line" style={{ maxWidth: `${44 - i * 4}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// A row's leading glyph: an accent swatch, a person avatar, or an icon.
function RowIcon({ item }) {
  if (item.swatch) {
    return (
      <span className="cmd-row-icon cmd-row-icon--bare">
        <span className="cmd-swatch" style={{ background: item.swatch }} />
      </span>
    )
  }
  if (item.avatar) {
    return (
      <span
        className="cmd-row-icon cmd-row-icon--bare avatar"
        style={{ background: `linear-gradient(135deg, hsl(${item.avatar.hue} 70% 58%), hsl(${item.avatar.hue + 40} 68% 48%))` }}
      >
        {item.avatar.initials}
      </span>
    )
  }
  return (
    <span className="cmd-row-icon">
      <Icon name={item.icon} />
    </span>
  )
}

/**
 * Renders the filtered, grouped results. The active row is tracked by id and
 * scrolled into view as the keyboard selection moves. Mouse *movement* (not
 * enter) sets the active row so a resting cursor never fights the keyboard.
 */
export default function ResultList({ groups, activeId, onHoverItem, onRunItem }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <div className="cmd-results" role="listbox" aria-label="Commands">
      {groups.map((group, gi) => (
        <div className="cmd-group" key={group.id}>
          <div className="cmd-group-head">
            <span>{group.label}</span>
            <span className="cmd-group-key">⌘{gi + 1}</span>
          </div>
          {group.results.map(({ item, indices }) => {
            const active = item.id === activeId
            return (
              <button
                key={item.id}
                ref={active ? activeRef : null}
                type="button"
                className="cmd-row"
                data-active={active}
                role="option"
                aria-selected={active}
                onMouseMove={() => onHoverItem(item.id)}
                onClick={() => onRunItem(item)}
              >
                <RowIcon item={item} />
                <span className="cmd-row-label">
                  <Highlight text={item.label} indices={indices} />
                </span>
                {item.hint && <span className="cmd-row-hint">{item.hint}</span>}
                <span className="cmd-row-enter" aria-hidden="true">
                  <Icon name={item.panel ? 'chevronRight' : 'cornerDownLeft'} />
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
