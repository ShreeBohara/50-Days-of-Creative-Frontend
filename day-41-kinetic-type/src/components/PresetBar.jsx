import { SCENES } from '../lib/presets.js'

/** Horizontal strip of scene presets, each previewing its palette. */
export default function PresetBar({ sceneId, onScene }) {
  return (
    <nav className="presets" aria-label="Scenes">
      <span className="presets-tag">Scenes</span>
      <div className="presets-row">
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={'preset' + (s.id === sceneId ? ' is-active' : '')}
            aria-pressed={s.id === sceneId}
            onClick={() => onScene(s.id)}
          >
            <span className="preset-swatches" aria-hidden="true">
              <i style={{ background: s.palette.paper }} />
              <i style={{ background: s.palette.ink }} />
              <i style={{ background: s.palette.accent }} />
            </span>
            {s.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
