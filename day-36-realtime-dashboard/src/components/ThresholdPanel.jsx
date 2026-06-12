import { useEffect, useRef, useState } from 'react'
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { DEFAULT_THRESHOLDS, METRICS } from '../data/metrics'

const copyThresholds = (thresholds) =>
  Object.fromEntries(
    Object.entries(thresholds).map(([metricId, values]) => [metricId, { ...values }]),
  )

function getErrors(thresholds) {
  return Object.fromEntries(
    METRICS.flatMap((metric) => {
      const values = thresholds[metric.id]
      const invalid =
        values.warning < 0 ||
        values.critical > metric.max ||
        values.warning >= values.critical
      return invalid
        ? [[metric.id, `Use 0–${metric.max}; warning must remain below critical.`]]
        : []
    }),
  )
}

export function ThresholdPanel({ onApply, onClose, thresholds }) {
  const drawerRef = useRef(null)
  const [draft, setDraft] = useState(() => copyThresholds(thresholds))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const firstInput = drawerRef.current?.querySelector('input')
    firstInput?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const updateValue = (metricId, level, value) => {
    setDraft((current) => ({
      ...current,
      [metricId]: {
        ...current[metricId],
        [level]: Number(value),
      },
    }))
    setErrors((current) => ({ ...current, [metricId]: undefined }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = getErrors(draft)
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) {
      onApply(copyThresholds(draft))
    }
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className="threshold-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="threshold-title"
      >
        <header className="threshold-header">
          <div>
            <span aria-hidden="true">
              <SlidersHorizontal size={16} />
            </span>
            <div>
              <h2 id="threshold-title">Threshold configuration</h2>
              <p>Set warning and critical incident levels.</p>
            </div>
          </div>
          <button type="button" aria-label="Close threshold configuration" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="threshold-columns" aria-hidden="true">
            <span>Signal</span>
            <span>Warning</span>
            <span>Critical</span>
          </div>
          <div className="threshold-list">
            {METRICS.map((metric) => (
              <fieldset key={metric.id}>
                <legend>
                  <i style={{ '--metric-color': metric.color }} aria-hidden="true"></i>
                  {metric.label}
                </legend>
                <label htmlFor={`${metric.id}-warning`}>
                  <span>Warning</span>
                  <input
                    id={`${metric.id}-warning`}
                    type="number"
                    min="0"
                    max={metric.max}
                    step={metric.decimals ? '0.1' : '1'}
                    inputMode="decimal"
                    value={draft[metric.id].warning}
                    onChange={(event) => updateValue(metric.id, 'warning', event.target.value)}
                    aria-describedby={errors[metric.id] ? `${metric.id}-error` : undefined}
                  />
                </label>
                <label htmlFor={`${metric.id}-critical`}>
                  <span>Critical</span>
                  <input
                    id={`${metric.id}-critical`}
                    type="number"
                    min="0"
                    max={metric.max}
                    step={metric.decimals ? '0.1' : '1'}
                    inputMode="decimal"
                    value={draft[metric.id].critical}
                    onChange={(event) => updateValue(metric.id, 'critical', event.target.value)}
                    aria-describedby={errors[metric.id] ? `${metric.id}-error` : undefined}
                  />
                </label>
                {errors[metric.id] ? (
                  <p id={`${metric.id}-error`} className="threshold-error">
                    {errors[metric.id]}
                  </p>
                ) : null}
              </fieldset>
            ))}
          </div>
          <footer className="threshold-actions">
            <button
              type="button"
              className="drawer-button is-secondary"
              onClick={() => {
                setDraft(copyThresholds(DEFAULT_THRESHOLDS))
                setErrors({})
              }}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset defaults
            </button>
            <button type="submit" className="drawer-button is-primary">
              Apply thresholds
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
