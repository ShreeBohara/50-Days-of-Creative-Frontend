import { figureExtent, pathToSvgD, samplePath, type HarmonographParams } from '../domain/harmonograph'
import type { Palette } from '../domain/palettes'

const GROUND = '#0a0e1a'

interface Options {
  lineWidth?: number
  glow?: number
  size?: number
}

/** Render a standalone, poster-ready SVG document string for a figure. */
export function buildFigureSvg(
  params: HarmonographParams,
  palette: Palette,
  { lineWidth = 2.4, glow = 1, size = 1000 }: Options = {},
): string {
  const d = pathToSvgD(samplePath(params, { steps: Math.max(params.steps, 6000) }), figureExtent(params), size)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="${size * 0.12}" y1="${size * 0.16}" x2="${size * 0.88}" y2="${size * 0.84}">
      <stop offset="0%" stop-color="${palette.from}"/>
      <stop offset="55%" stop-color="${palette.to}"/>
      <stop offset="100%" stop-color="${palette.from}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${3.5 * glow}"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="${GROUND}"/>
  <path d="${d}" fill="none" stroke="${palette.glow}" stroke-width="${lineWidth * 2.4}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" opacity="${0.32 * glow}"/>
  <path d="${d}" fill="none" stroke="url(#ink)" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
}

export function downloadString(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  downloadBlob(blob, filename)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
