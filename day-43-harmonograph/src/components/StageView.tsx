import { useMemo } from 'react'
import { figureExtent, pathToSvgD, samplePath, type HarmonographParams } from '../domain/harmonograph'
import type { Palette } from '../domain/palettes'
import GridBackdrop from './GridBackdrop'
import HarmonographCanvas from './HarmonographCanvas'

interface Props {
  params: HarmonographParams
  palette: Palette
  lineWidth: number
  glow: number
}

export default function StageView({ params, palette, lineWidth, glow }: Props) {
  const d = useMemo(() => {
    const points = samplePath(params)
    return pathToSvgD(points, figureExtent(params))
  }, [params])

  return (
    <div className="stage">
      <GridBackdrop />
      <HarmonographCanvas d={d} palette={palette} lineWidth={lineWidth} glow={glow} />
    </div>
  )
}
