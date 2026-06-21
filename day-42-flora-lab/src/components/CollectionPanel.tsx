import { BookmarkPlus, Eye, Trash2 } from 'lucide-react'
import type { SavedSpecimen } from '../domain/collection'
import { useFloraStore } from '../store/useFloraStore'
import { GenomeReadout } from './GenomeReadout'
import { PlantArtwork } from './PlantArtwork'
import { BreedingLab } from './BreedingLab'

function shortDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function ArchiveItem({ specimen }: { specimen: SavedSpecimen }) {
  const loadSpecimen = useFloraStore((state) => state.loadSpecimen)
  const removeSpecimen = useFloraStore((state) => state.removeSpecimen)

  return (
    <li className="archive-item">
      <div className="archive-thumbnail" aria-hidden="true">
        <PlantArtwork genome={specimen.genome} titleId={`archive-${specimen.id}`} />
      </div>
      <div className="archive-item-copy">
        <strong>{specimen.genome.seed}</strong>
        <span>{specimen.genome.architecture.symmetry} · {shortDate(specimen.savedAt)}</span>
      </div>
      <div className="archive-item-actions">
        <button type="button" aria-label={`Open ${specimen.genome.seed}`} onClick={() => loadSpecimen(specimen.id)}>
          <Eye aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Delete ${specimen.genome.seed}`} onClick={() => removeSpecimen(specimen.id)}>
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export function CollectionPanel() {
  const collection = useFloraStore((state) => state.collection)
  const saveCurrent = useFloraStore((state) => state.saveCurrent)

  return (
    <div className="collection-panel">
      <button className="save-specimen-button" type="button" onClick={saveCurrent}>
        <BookmarkPlus aria-hidden="true" />
        Preserve current specimen
        <span>{collection.length}/12</span>
      </button>

      {collection.length > 0 ? (
        <ul className="archive-list" aria-label="Saved specimens">
          {collection.map((specimen) => <ArchiveItem key={specimen.id} specimen={specimen} />)}
        </ul>
      ) : (
        <div className="archive-empty">
          <p>No pressed specimens yet.</p>
          <span>Preserve this plant to begin a breeding archive.</span>
        </div>
      )}

      <BreedingLab />
      <GenomeReadout />
    </div>
  )
}
