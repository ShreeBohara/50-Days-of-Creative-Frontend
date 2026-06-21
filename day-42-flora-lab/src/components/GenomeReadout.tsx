import { useFloraStore } from '../store/useFloraStore'

export function GenomeReadout() {
  const genome = useFloraStore((state) => state.genome)

  return (
    <dl className="genome-readout">
      <div><dt>Seed</dt><dd>{genome.seed}</dd></div>
      <div><dt>Pattern</dt><dd>{genome.architecture.symmetry}</dd></div>
      <div><dt>Foliage</dt><dd>{genome.foliage.shape} / {genome.foliage.arrangement}</dd></div>
      <div><dt>Bloom</dt><dd>{genome.bloom.form}</dd></div>
      <div><dt>Pigment</dt><dd>{genome.palette}</dd></div>
    </dl>
  )
}
