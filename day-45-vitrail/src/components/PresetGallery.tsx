import { PRESETS } from '../data/presets'
import { useStudioStore } from '../store/useStudioStore'
import WindowThumb from './WindowThumb'

export default function PresetGallery() {
  const activePresetId = useStudioStore((s) => s.activePresetId)
  const loadGenome = useStudioStore((s) => s.loadGenome)

  return (
    <div className="preset-grid">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`preset ${activePresetId === preset.id ? 'is-active' : ''}`}
          onClick={() => loadGenome(preset.genome, preset.id)}
          aria-pressed={activePresetId === preset.id}
          title={preset.note}
        >
          <WindowThumb genome={preset.genome} />
          <span className="preset__name">{preset.name}</span>
        </button>
      ))}
    </div>
  )
}
