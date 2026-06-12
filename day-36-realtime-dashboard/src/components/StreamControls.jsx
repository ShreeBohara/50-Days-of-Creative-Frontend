import { Pause, Play, Settings2, Zap } from 'lucide-react'

export function StreamControls({
  isPaused,
  onChaos,
  onPauseChange,
  onSpeedChange,
  speed,
  chaosActive,
  onOpenThresholds,
}) {
  return (
    <div className="stream-controls" aria-label="Simulation controls">
      <button
        type="button"
        className="control-button"
        aria-label={isPaused ? 'Resume data stream' : 'Pause data stream'}
        onClick={() => onPauseChange(!isPaused)}
      >
        {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        <span>{isPaused ? 'Resume' : 'Pause'}</span>
      </button>

      <label className="speed-control">
        <span>Speed</span>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
        />
        <output>{speed.toFixed(1)}x</output>
      </label>

      <button
        type="button"
        className={`control-button chaos-button ${chaosActive ? 'is-active' : ''}`}
        aria-pressed={chaosActive}
        onClick={onChaos}
      >
        <Zap size={14} aria-hidden="true" />
        <span>{chaosActive ? 'Incident active' : 'Chaos mode'}</span>
      </button>

      <button
        type="button"
        className="control-button settings-button"
        aria-label="Configure thresholds"
        onClick={onOpenThresholds}
      >
        <Settings2 size={14} aria-hidden="true" />
        <span>Thresholds</span>
      </button>
    </div>
  )
}
