import { Dices, Sparkles } from 'lucide-react'
import { PRESETS } from '../data/presets'
import { useStudioStore } from '../store/useStudioStore'
import FigureThumb from './FigureThumb'

export default function PresetGallery() {
  const loadPreset = useStudioStore((s) => s.loadPreset)
  const randomize = useStudioStore((s) => s.randomize)
  const mutateCurrent = useStudioStore((s) => s.mutateCurrent)
  const activePresetId = useStudioStore((s) => s.activePresetId)

  return (
    <div className="presets">
      <div className="presets__actions">
        <button type="button" className="gen-btn" onClick={randomize}>
          <Dices size={15} strokeWidth={1.8} />
          Randomize
        </button>
        <button type="button" className="gen-btn" onClick={() => mutateCurrent()}>
          <Sparkles size={15} strokeWidth={1.8} />
          Mutate
        </button>
      </div>

      <div className="presets__grid">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-card ${activePresetId === preset.id ? 'is-active' : ''}`}
            onClick={() => loadPreset(preset)}
            aria-pressed={activePresetId === preset.id}
          >
            <FigureThumb params={preset.params} paletteId={preset.paletteId} />
            <span className="preset-card__name">{preset.name}</span>
            <span className="preset-card__blurb">{preset.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
