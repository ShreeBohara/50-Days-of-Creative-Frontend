import { useState } from 'react'
import { Bookmark, Check, Pencil, Trash2 } from 'lucide-react'
import type { SavedFigure } from '../domain/collection'
import { useStudioStore } from '../store/useStudioStore'
import FigureThumb from './FigureThumb'
import IconButton from './IconButton'

function CollectionItem({ figure }: { figure: SavedFigure }) {
  const loadSaved = useStudioStore((s) => s.loadSaved)
  const renameSaved = useStudioStore((s) => s.renameSaved)
  const deleteSaved = useStudioStore((s) => s.deleteSaved)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(figure.name)

  const commit = () => {
    renameSaved(figure.id, draft)
    setEditing(false)
  }

  return (
    <li className="saved">
      <button
        type="button"
        className="saved__open"
        onClick={() => loadSaved(figure.id)}
        aria-label={`Load ${figure.name}`}
      >
        <FigureThumb params={figure.params} paletteId={figure.paletteId} />
      </button>
      <div className="saved__meta">
        {editing ? (
          <input
            className="saved__rename"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(figure.name)
                setEditing(false)
              }
            }}
            aria-label="Figure name"
          />
        ) : (
          <button type="button" className="saved__name" onClick={() => loadSaved(figure.id)}>
            {figure.name}
          </button>
        )}
        <span className="saved__date">
          {new Date(figure.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <div className="saved__tools">
        {editing ? (
          <IconButton label="Save name" onClick={commit}>
            <Check size={14} strokeWidth={1.9} />
          </IconButton>
        ) : (
          <IconButton label="Rename" onClick={() => setEditing(true)}>
            <Pencil size={14} strokeWidth={1.8} />
          </IconButton>
        )}
        <IconButton label="Delete" variant="danger" onClick={() => deleteSaved(figure.id)}>
          <Trash2 size={14} strokeWidth={1.8} />
        </IconButton>
      </div>
    </li>
  )
}

export default function CollectionPanel() {
  const collection = useStudioStore((s) => s.collection)
  const saveCurrent = useStudioStore((s) => s.saveCurrent)

  return (
    <div className="collection">
      <button type="button" className="gen-btn collection__save" onClick={() => saveCurrent()}>
        <Bookmark size={15} strokeWidth={1.8} />
        Save current figure
      </button>

      {collection.length === 0 ? (
        <p className="collection__empty">
          No saved figures yet. Tune a figure you like and save it to crossbreed later.
        </p>
      ) : (
        <ul className="saved-list">
          {collection.map((figure) => (
            <CollectionItem key={figure.id} figure={figure} />
          ))}
        </ul>
      )}
    </div>
  )
}
