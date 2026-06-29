import { getLanguage } from '../data/languages'
import type { WorldMap } from '../domain/compose'
import { getPalette } from '../domain/palettes'

export default function ReadoutPanel({ map }: { map: WorldMap }) {
  const rows: [string, string][] = [
    ['Chart', map.title],
    ['Seed', map.params.seed],
    ['Land', `${Math.round(map.stats.landFraction * 100)}%`],
    ['Relief', map.stats.maxElevation.toFixed(2)],
    ['Places', String(map.labels.length)],
    ['Style', `${getPalette(map.params.biomePaletteId).name} · ${getLanguage(map.params.languageId).name}`],
  ]

  return (
    <dl className="readout">
      {rows.map(([k, v]) => (
        <div className="readout__row" key={k}>
          <dt className="readout__k">{k}</dt>
          <dd className="readout__v">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
