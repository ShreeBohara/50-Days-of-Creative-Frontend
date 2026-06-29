import type { WorldMap } from '../domain/compose'
import { getPalette } from '../domain/palettes'
import MapCanvas, { type ViewOptions } from './MapCanvas'

interface StageViewProps {
  map: WorldMap
  view: ViewOptions
  reducedMotion: boolean
  drawKey: number
}

export default function StageView({ map, view, reducedMotion, drawKey }: StageViewProps) {
  const palette = getPalette(map.params.biomePaletteId)

  return (
    <div className="chart-frame">
      <div className="chart-frame__plate">
        <MapCanvas
          map={map}
          palette={palette}
          view={view}
          reducedMotion={reducedMotion}
          drawKey={drawKey}
        />
      </div>
    </div>
  )
}
