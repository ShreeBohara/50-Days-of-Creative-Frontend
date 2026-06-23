import { PARAM_RANGES, type Pendulum } from '../domain/harmonograph'
import { useStudioStore, type Axis } from '../store/useStudioStore'
import RangeControl from './RangeControl'

const AXES: { axis: Axis; label: string }[] = [
  { axis: 'x', label: 'X axis' },
  { axis: 'y', label: 'Y axis' },
]

function PendulumGroup({ axis, index, pendulum }: { axis: Axis; index: number; pendulum: Pendulum }) {
  const setPendulum = useStudioStore((s) => s.setPendulum)
  const tag = (field: string) => `${axis}${index}.${field}`

  return (
    <div className="pendulum">
      <div className="pendulum__head">
        <span className="pendulum__dot" data-axis={axis} aria-hidden="true" />
        <span className="pendulum__name">Pendulum {index + 1}</span>
      </div>
      <RangeControl
        label="Frequency"
        value={pendulum.freq}
        min={PARAM_RANGES.freq.min}
        max={PARAM_RANGES.freq.max}
        step={PARAM_RANGES.freq.step}
        onChange={(v) => setPendulum(axis, index, { freq: v }, tag('freq'))}
        format={(v) => v.toFixed(2)}
      />
      <RangeControl
        label="Amplitude"
        value={pendulum.amp}
        min={PARAM_RANGES.amp.min}
        max={PARAM_RANGES.amp.max}
        step={PARAM_RANGES.amp.step}
        onChange={(v) => setPendulum(axis, index, { amp: v }, tag('amp'))}
        format={(v) => v.toFixed(2)}
      />
      <RangeControl
        label="Phase"
        value={pendulum.phase}
        min={PARAM_RANGES.phase.min}
        max={PARAM_RANGES.phase.max}
        step={PARAM_RANGES.phase.step}
        onChange={(v) => setPendulum(axis, index, { phase: v }, tag('phase'))}
        format={(v) => `${(v / Math.PI).toFixed(2)}π`}
      />
      <RangeControl
        label="Damping"
        value={pendulum.damping}
        min={PARAM_RANGES.damping.min}
        max={PARAM_RANGES.damping.max}
        step={PARAM_RANGES.damping.step}
        onChange={(v) => setPendulum(axis, index, { damping: v }, tag('damping'))}
        format={(v) => v.toFixed(4)}
      />
    </div>
  )
}

export default function PendulumControls() {
  const params = useStudioStore((s) => s.params)

  return (
    <div className="pendulums">
      {AXES.map(({ axis, label }) => (
        <div key={axis} className="pendulums__axis">
          <p className="pendulums__axis-label eyebrow">{label}</p>
          {params[axis].map((pendulum, index) => (
            <PendulumGroup key={index} axis={axis} index={index} pendulum={pendulum} />
          ))}
        </div>
      ))}
    </div>
  )
}
