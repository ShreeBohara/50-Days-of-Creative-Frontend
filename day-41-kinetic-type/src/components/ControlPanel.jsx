import { BEHAVIORS, getBehavior } from '../lib/behaviors.js'

function Slider({ label, unit, value, min, max, step, onChange, format }) {
  return (
    <label className="ctl-field">
      <span className="ctl-field-head">
        <span className="ctl-field-label">{label}</span>
        <span className="ctl-field-value">
          {format ? format(value) : value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        className="ctl-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

export default function ControlPanel({
  behaviorId,
  onBehavior,
  params,
  onParams,
  onDownload,
  onCopy,
  exportStatus,
}) {
  const active = getBehavior(behaviorId)
  const set = (key) => (val) => onParams({ ...params, [key]: val })

  return (
    <aside className="panel" aria-label="Studio controls">
      <section className="panel-block">
        <h2 className="panel-title">Behavior</h2>
        <div className="behavior-grid" role="radiogroup" aria-label="Behavior">
          {BEHAVIORS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={b.id === behaviorId}
              className={
                'behavior-btn' + (b.id === behaviorId ? ' is-active' : '')
              }
              onClick={() => onBehavior(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="panel-hint">{active.hint}</p>
      </section>

      <section className="panel-block">
        <h2 className="panel-title">Parameters</h2>
        <Slider
          label="Field"
          unit="px"
          value={params.radius}
          min={120}
          max={560}
          step={10}
          onChange={set('radius')}
          format={(v) => Math.round(v)}
        />
        <Slider
          label="Force"
          unit="×"
          value={params.intensity}
          min={0.2}
          max={2}
          step={0.05}
          onChange={set('intensity')}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Rest weight"
          unit=""
          value={params.baseWeight}
          min={100}
          max={700}
          step={10}
          onChange={set('baseWeight')}
          format={(v) => Math.round(v)}
        />
        <Slider
          label="Scale"
          unit="×"
          value={params.size}
          min={0.6}
          max={1.5}
          step={0.02}
          onChange={set('size')}
          format={(v) => v.toFixed(2)}
        />
      </section>

      <section className="panel-block">
        <h2 className="panel-title">Export</h2>
        <div className="export-row">
          <button type="button" className="export-btn primary" onClick={onDownload}>
            Download PNG
          </button>
          <button type="button" className="export-btn" onClick={onCopy}>
            Copy
          </button>
        </div>
        <p className="panel-hint" role="status" aria-live="polite">
          {exportStatus || 'Snapshot the current frame as a poster.'}
        </p>
      </section>
    </aside>
  )
}
