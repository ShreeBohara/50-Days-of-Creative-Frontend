import { useMemo } from 'react'
import { composeWorld } from '../domain/compose'
import { getPalette } from '../domain/palettes'
import type { WorldParams } from '../domain/world'
import MapCanvas, { type ViewOptions } from './MapCanvas'

interface StageViewProps {
  params: WorldParams
  view: ViewOptions
  reducedMotion: boolean
  drawKey: number
}

export default function StageView({ params, view, reducedMotion, drawKey }: StageViewProps) {
  const map = useMemo(() => composeWorld(params), [params])
  const palette = getPalette(params.biomePaletteId)

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
