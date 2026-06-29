import { Save, Trash2 } from 'lucide-react'
import { useStudioStore } from '../store/useStudioStore'
import IconButton from './IconButton'
import WorldThumb from './WorldThumb'

export default function CollectionPanel() {
  const collection = useStudioStore((s) => s.collection)
  const saveCurrent = useStudioStore((s) => s.saveCurrent)
  const loadSaved = useStudioStore((s) => s.loadSaved)
  const deleteSaved = useStudioStore((s) => s.deleteSaved)
  const renameSaved = useStudioStore((s) => s.renameSaved)

  return (
    <div className="collection">
      <button type="button" className="btn-wide collection__save" onClick={() => saveCurrent()}>
        <Save size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>Save this world</span>
      </button>

      {collection.length === 0 ? (
        <p className="collection__empty">
          Your atlas is empty. Save a world to keep it here — it persists in this browser.
        </p>
      ) : (
        <ul className="collection__list">
          {collection.map((w) => (
            <li key={w.id} className="saved">
              <button
                type="button"
                className="saved__open"
                onClick={() => loadSaved(w.id)}
                title={`Open ${w.name}`}
              >
                <WorldThumb params={w.params} size={48} />
                <span className="saved__name">{w.name}</span>
              </button>
              <div className="saved__actions">
                <IconButton
                  label={`Rename ${w.name}`}
                  onClick={() => {
                    const next = window.prompt('Rename world', w.name)
                    if (next) renameSaved(w.id, next)
                  }}
                >
                  <span aria-hidden="true" className="saved__rename">
                    Aa
                  </span>
                </IconButton>
                <IconButton label={`Delete ${w.name}`} variant="danger" onClick={() => deleteSaved(w.id)}>
                  <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
