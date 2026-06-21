import { Dna, Sprout } from 'lucide-react'
import { useMemo } from 'react'
import { createOffspringSet } from '../domain/genetics'
import { useFloraStore } from '../store/useFloraStore'
import { PlantArtwork } from './PlantArtwork'

export function BreedingLab() {
  const collection = useFloraStore((state) => state.collection)
  const parentAId = useFloraStore((state) => state.parentAId)
  const parentBId = useFloraStore((state) => state.parentBId)
  const setParent = useFloraStore((state) => state.setParent)
  const cultivateOffspring = useFloraStore((state) => state.cultivateOffspring)
  const parentA = collection.find((item) => item.id === parentAId)
  const parentB = collection.find((item) => item.id === parentBId)
  const offspring = useMemo(
    () => parentA && parentB ? createOffspringSet(parentA.genome, parentB.genome) : [],
    [parentA, parentB],
  )

  return (
    <section className="breeding-lab" aria-labelledby="breeding-title">
      <div className="subsection-heading">
        <Dna aria-hidden="true" />
        <div>
          <h3 id="breeding-title">Crossbreeding bench</h3>
          <p>Combine two preserved specimens.</p>
        </div>
      </div>

      {collection.length < 2 ? (
        <div className="breeding-empty">
          Preserve at least two different plants to reveal their offspring.
        </div>
      ) : (
        <>
          <div className="parent-selectors">
            <label htmlFor="parent-a">
              <span>Parent A</span>
              <select id="parent-a" value={parentAId ?? ''} onChange={(event) => setParent('a', event.target.value || null)}>
                <option value="">Select specimen</option>
                {collection.map((item) => <option key={item.id} value={item.id} disabled={item.id === parentBId}>{item.genome.seed}</option>)}
              </select>
            </label>
            <span className="cross-symbol" aria-hidden="true">×</span>
            <label htmlFor="parent-b">
              <span>Parent B</span>
              <select id="parent-b" value={parentBId ?? ''} onChange={(event) => setParent('b', event.target.value || null)}>
                <option value="">Select specimen</option>
                {collection.map((item) => <option key={item.id} value={item.id} disabled={item.id === parentAId}>{item.genome.seed}</option>)}
              </select>
            </label>
          </div>

          {offspring.length > 0 ? (
            <div className="offspring-grid" aria-label="Generated offspring">
              {offspring.map((child, index) => (
                <article className="offspring-card" key={child.seed}>
                  <div className="offspring-artwork" aria-hidden="true">
                    <PlantArtwork genome={child} titleId={`offspring-${index}`} />
                  </div>
                  <div>
                    <strong>Hybrid {String(index + 1).padStart(2, '0')}</strong>
                    <span>{child.architecture.symmetry} / {child.foliage.shape}</span>
                  </div>
                  <button type="button" onClick={() => cultivateOffspring(child)}>
                    <Sprout aria-hidden="true" /> Cultivate
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="offspring-prompt">Select both parents to generate three reproducible hybrids.</p>
          )}
        </>
      )}
    </section>
  )
}
