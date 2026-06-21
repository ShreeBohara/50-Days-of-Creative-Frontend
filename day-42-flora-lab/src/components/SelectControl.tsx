interface SelectOption<Value extends string> {
  value: Value
  label: string
}

interface SelectControlProps<Value extends string> {
  id: string
  label: string
  value: Value
  options: readonly SelectOption<Value>[]
  onChange: (value: Value) => void
}

export function SelectControl<Value extends string>({ id, label, value, options, onChange }: SelectControlProps<Value>) {
  return (
    <label className="select-control" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as Value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
