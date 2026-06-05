import { RotateCcw, Shuffle } from 'lucide-react'
import { PLANET_CONTROLS } from '../data/planetConfig'

function formatControlValue(control, value) {
  if (control.format === 'percent') return `${Math.round(value * 100)}%`
  if (control.format === 'degrees') return `${Math.round(value)}°`
  if (control.format === 'speed') return `${value.toFixed(2)}x`
  return value
}

function SliderControl({ control, value, onChange }) {
  const progress = ((value - control.min) / (control.max - control.min)) * 100
  const inputId = `planet-control-${control.key}`

  return (
    <label className="control-row" htmlFor={inputId}>
      <span className="control-row__label">
        {control.label}
        <strong>{formatControlValue(control, value)}</strong>
      </span>
      <input
        id={inputId}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        style={{ '--range-progress': `${progress}%` }}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
      />
    </label>
  )
}

export default function ControlPanel({ settings, onSettingChange, onRandomize, onReset }) {
  return (
    <div className="control-panel">
      <label className="seed-control" htmlFor="planet-seed">
        <span>Seed</span>
        <input
          id="planet-seed"
          type="number"
          min="0"
          max="9999"
          step="0.01"
          value={settings.seed}
          onChange={(event) => onSettingChange('seed', Number(event.target.value))}
        />
      </label>

      <div className="control-list">
        {PLANET_CONTROLS.map((control) => (
          <SliderControl
            key={control.key}
            control={control}
            value={settings[control.key]}
            onChange={onSettingChange}
          />
        ))}
      </div>

      <div className="control-actions">
        <button type="button" onClick={onRandomize}>
          <Shuffle size={16} strokeWidth={2.2} aria-hidden="true" />
          Randomize
        </button>
        <button type="button" className="ghost-button" onClick={onReset}>
          <RotateCcw size={16} strokeWidth={2.2} aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  )
}
