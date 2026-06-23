import { useId, useMemo } from 'react'
import { figureExtent, pathToSvgD, samplePath, type HarmonographParams } from '../domain/harmonograph'
import { getPalette } from '../domain/palettes'

interface Props {
  params: HarmonographParams
  paletteId: string
}

// A small, static, lower-resolution preview of a figure for cards/lists.
export default function FigureThumb({ params, paletteId }: Props) {
  const palette = getPalette(paletteId)
  const id = useId().replace(/:/g, '')
  const d = useMemo(
    () => pathToSvgD(samplePath(params, { steps: 1400 }), figureExtent(params), 200, 0.12),
    [params],
  )

  return (
    <svg className="thumb" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`t-${id}`} gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="180" y2="180">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#t-${id})`} strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  )
}
