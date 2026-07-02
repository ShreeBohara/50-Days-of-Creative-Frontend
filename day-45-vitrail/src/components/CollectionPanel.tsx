import { useState } from 'react'
import { BookmarkPlus, Check, Pencil, Trash2 } from 'lucide-react'
import { useStudioStore } from '../store/useStudioStore'
import IconButton from './IconButton'
import WindowThumb from './WindowThumb'

export default function CollectionPanel() {
  const collection = useStudioStore((s) => s.collection)
  const saveCurrent = useStudioStore((s) => s.saveCurrent)
  const loadSaved = useStudioStore((s) => s.loadSaved)
  const renameSaved = useStudioStore((s) => s.renameSaved)
  const deleteSaved = useStudioStore((s) => s.deleteSaved)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const commitRename = (id: string) => {
    renameSaved(id, draft)
    setEditingId(null)
  }

  return (
    <div className="collection">
      <button type="button" className="btn-ghost collection__save" onClick={() => saveCurrent()}>
        <BookmarkPlus size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>Keep this window</span>
      </button>

      {collection.length === 0 ? (
        <p className="collection__empty">Nothing kept yet — windows you keep are stored in this browser.</p>
      ) : (
        <ul className="collection__list">
          {collection.map((saved) => (
            <li key={saved.id} className="collection__row">
              <button
                type="button"
                className="collection__load"
                onClick={() => loadSaved(saved.id)}
                title={`Load “${saved.name}”`}
              >
                <WindowThumb genome={saved.genome} />
                {editingId !== saved.id && <span className="collection__name">{saved.name}</span>}
              </button>
              {editingId === saved.id ? (
                <>
                  <input
                    className="collection__rename mono-num"
                    value={draft}
                    autoFocus
                    maxLength={40}
                    aria-label={`Rename ${saved.name}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(saved.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <IconButton label="Confirm rename" onClick={() => commitRename(saved.id)}>
                    <Check size={15} strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  label={`Rename ${saved.name}`}
                  onClick={() => {
                    setEditingId(saved.id)
                    setDraft(saved.name)
                  }}
                >
                  <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
              )}
              <IconButton label={`Delete ${saved.name}`} variant="danger" onClick={() => deleteSaved(saved.id)}>
                <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
