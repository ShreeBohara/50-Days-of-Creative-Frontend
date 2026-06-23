import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  figureExtent,
  pathToSvgD,
  samplePath,
  type HarmonographParams,
} from '../domain/harmonograph'
import type { Palette } from '../domain/palettes'
import GridBackdrop from './GridBackdrop'
import HarmonographCanvas from './HarmonographCanvas'
import IconButton from './IconButton'

interface Props {
  params: HarmonographParams
  palette: Palette
  lineWidth: number
  glow: number
  drawKey: number
  reducedMotion: boolean
  onReplay: () => void
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export default function StageView({
  params,
  palette,
  lineWidth,
  glow,
  drawKey,
  reducedMotion,
  onReplay,
}: Props) {
  const { d, drawMs } = useMemo(() => {
    const points = samplePath(params)
    return {
      d: pathToSvgD(points, figureExtent(params)),
      drawMs: clamp(1200 + points.length * 0.28, 1500, 4000),
    }
  }, [params])

  return (
    <div className="stage">
      <GridBackdrop />
      <HarmonographCanvas
        d={d}
        palette={palette}
        lineWidth={lineWidth}
        glow={glow}
        drawKey={drawKey}
        drawMs={drawMs}
        animate={!reducedMotion}
      />
      <div className="stage__tools">
        <IconButton label="Replay drawing" onClick={onReplay}>
          <RotateCcw size={16} strokeWidth={1.8} />
        </IconButton>
      </div>
    </div>
  )
}
