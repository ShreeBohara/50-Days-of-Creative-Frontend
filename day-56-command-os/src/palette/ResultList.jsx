import { useEffect, useRef } from 'react'
import Icon from '../icons.jsx'
import Highlight from './Highlight.jsx'

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
                <span className="cmd-row-icon"><Icon name={item.icon} /></span>
                <span className="cmd-row-label">
                  <Highlight text={item.label} indices={indices} />
                </span>
                {item.hint && <span className="cmd-row-hint">{item.hint}</span>}
                <span className="cmd-row-enter" aria-hidden="true"><Icon name="cornerDownLeft" /></span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
