import { frequencyRatio } from '../domain/harmonograph'
import { getPalette } from '../domain/palettes'
import { useStudioStore } from '../store/useStudioStore'

export default function ReadoutPanel() {
  const params = useStudioStore((s) => s.params)
  const palette = getPalette(useStudioStore((s) => s.paletteId))

  const stats: { label: string; value: string }[] = [
    { label: 'Ratio', value: frequencyRatio(params) },
    { label: 'Points', value: (params.steps + 1).toLocaleString() },
    { label: 'Sweep', value: `${Math.round(params.duration)}` },
    { label: 'Ink', value: palette.name },
  ]

  return (
    <div className="readout" aria-label="Figure readout">
      <div className="readout__rows">
        {stats.map((s) => (
          <div key={s.label} className="readout__cell">
            <span className="readout__k">{s.label}</span>
            <span className="readout__v mono-num">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="readout__seed">
        <span className="readout__k">Seed</span>
        <span className="readout__v">{params.seed}</span>
      </div>
    </div>
  )
}
