import { useId } from 'react'
import type { Palette } from '../domain/palettes'

interface Props {
  d: string
  palette: Palette
  lineWidth: number
  glow: number
}

export default function HarmonographCanvas({ d, palette, lineWidth, glow }: Props) {
  const id = useId().replace(/:/g, '')
  const gradId = `grad-${id}`
  const glowId = `glow-${id}`

  return (
    <svg
      className="figure"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Harmonograph figure"
    >
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="120" y1="160" x2="880" y2="840">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="55%" stopColor={palette.to} />
          <stop offset="100%" stopColor={palette.from} />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={3.5 * glow} />
        </filter>
      </defs>

      <path
        className="figure__glow"
        d={d}
        fill="none"
        stroke={palette.glow}
        strokeWidth={lineWidth * 2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
        opacity={0.32 * glow}
      />
      <path
        className="figure__line"
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
