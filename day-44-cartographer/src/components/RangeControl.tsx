import { useId } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export default function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toFixed(2),
}: Props) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="range">
      <div className="range__top">
        <label className="range__label" htmlFor={id}>
          {label}
        </label>
        <output className="range__value mono-num" htmlFor={id}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        className="range__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--range-pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}
