import type { WindowSpec } from '../domain/compose'

interface Props {
  spec: WindowSpec
}

export default function ReadoutPanel({ spec }: Props) {
  const { genome } = spec
  const rows: Array<[string, string]> = [
    ['Form', `${genome.archetype} · ${genome.symmetry}-fold`],
    ['Rings', String(genome.rings)],
    ['Panes', String(spec.panes.length)],
    ['Glass', spec.palette.name],
    ['Lead', `${spec.leadWidth.toFixed(1)} px came`],
    ['Seed', genome.seed],
  ]

  return (
    <dl className="readout" aria-label="Window readout">
      {rows.map(([term, value]) => (
        <div className="readout__row" key={term}>
          <dt>{term}</dt>
          <dd className="mono-num">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
