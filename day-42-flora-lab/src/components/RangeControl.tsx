interface RangeControlProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  valueLabel?: string
  onChange: (value: number) => void
}

export function RangeControl({ id, label, value, min, max, step, valueLabel, onChange }: RangeControlProps) {
  const progress = ((value - min) / (max - min)) * 100

  return (
    <div className="range-control">
      <div className="control-label-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{valueLabel ?? value.toFixed(step < 1 ? 2 : 0)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
