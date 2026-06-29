import { useMemo } from 'react'
import { polylineToPath, traceContours } from '../domain/coastline'
import { getPalette } from '../domain/palettes'
import { generateHeightfield, type WorldParams } from '../domain/world'

// A cheap island silhouette for galleries — coastline only, no rivers/labels.
export default function WorldThumb({ params, size = 84 }: { params: WorldParams; size?: number }) {
  const palette = getPalette(params.biomePaletteId)
  const d = useMemo(() => {
    const field = generateHeightfield(params)
    const scale = 100 / field.size
    return traceContours(field.data, field.size, params.seaLevel)
      .map((line) => polylineToPath(line, scale, true))
      .join('')
  }, [params])

  return (
    <svg
      className="world-thumb"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect width="100" height="100" fill={palette.biomes[0]} />
      <path d={d} fill={palette.biomes[6]} stroke={palette.ink} strokeWidth="0.9" fillRule="evenodd" />
    </svg>
  )
}
