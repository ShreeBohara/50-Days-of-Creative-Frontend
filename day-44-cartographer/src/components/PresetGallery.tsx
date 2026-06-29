import { PRESETS } from '../data/presets'
import { useStudioStore } from '../store/useStudioStore'
import WorldThumb from './WorldThumb'

export default function PresetGallery() {
  const loadPreset = useStudioStore((s) => s.loadPreset)
  const activePresetId = useStudioStore((s) => s.activePresetId)

  return (
    <div className="gallery">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`gallery-card ${activePresetId === preset.id ? 'is-active' : ''}`}
          onClick={() => loadPreset(preset)}
          aria-pressed={activePresetId === preset.id}
        >
          <WorldThumb params={preset.params} size={72} />
          <span className="gallery-card__meta">
            <span className="gallery-card__name">{preset.name}</span>
            <span className="gallery-card__blurb">{preset.blurb}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
