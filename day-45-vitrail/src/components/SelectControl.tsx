import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

export default function SelectControl({ label, value, options, onChange }: Props) {
  const id = useId()
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
      </div>
    </div>
  )
}
