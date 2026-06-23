import { PARAM_RANGES } from '../domain/harmonograph'
import { PALETTES } from '../domain/palettes'
import { useStudioStore } from '../store/useStudioStore'
import RangeControl from './RangeControl'
import SelectControl from './SelectControl'

export default function GlobalControls() {
  const params = useStudioStore((s) => s.params)
  const setTiming = useStudioStore((s) => s.setTiming)
  const paletteId = useStudioStore((s) => s.paletteId)
  const setPaletteId = useStudioStore((s) => s.setPaletteId)
  const lineWidth = useStudioStore((s) => s.lineWidth)
  const setLineWidth = useStudioStore((s) => s.setLineWidth)
  const glow = useStudioStore((s) => s.glow)
  const setGlow = useStudioStore((s) => s.setGlow)

  return (
    <div className="globals">
      <RangeControl
        label="Duration"
        value={params.duration}
        min={PARAM_RANGES.duration.min}
        max={PARAM_RANGES.duration.max}
        step={PARAM_RANGES.duration.step}
        onChange={(v) => setTiming({ duration: v }, 'duration')}
        format={(v) => `${Math.round(v)}`}
      />
      <RangeControl
        label="Resolution"
        value={params.steps}
        min={PARAM_RANGES.steps.min}
        max={PARAM_RANGES.steps.max}
        step={PARAM_RANGES.steps.step}
        onChange={(v) => setTiming({ steps: v }, 'steps')}
        format={(v) => `${Math.round(v)} pts`}
      />
      <RangeControl
        label="Line weight"
        value={lineWidth}
        min={1}
        max={5}
        step={0.1}
        onChange={setLineWidth}
        format={(v) => v.toFixed(1)}
      />
      <RangeControl
        label="Glow"
        value={glow}
        min={0}
        max={2}
        step={0.05}
        onChange={setGlow}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <SelectControl
        label="Palette"
        value={paletteId}
        options={PALETTES.map((p) => ({ value: p.id, label: p.name }))}
        onChange={setPaletteId}
      />
    </div>
  )
}
