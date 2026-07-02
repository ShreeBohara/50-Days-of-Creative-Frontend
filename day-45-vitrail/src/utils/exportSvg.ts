// Standalone SVG document builder — the same window the stage shows, but
// self-contained (backdrop included) so the file reads correctly anywhere.

import type { WindowSpec } from '../domain/compose'

const LEAD = '#171221'
const LEAD_FRAME = '#0e0a17'
const BACKDROP = '#0b0a12'

export function buildSvgMarkup(spec: WindowSpec): string {
  const { frame } = spec
  const panes = spec.panes
    .map(
      (p) =>
        `<path d="${p.path}" fill="${p.fill}" fill-opacity="${(0.72 + 0.28 * p.glow).toFixed(3)}" stroke="${LEAD}" stroke-width="${spec.leadWidth}" stroke-linejoin="round"/>`,
    )
    .join('\n    ')
  const lead = spec.leadPaths
    .map((d) => `<path d="${d}" fill="none" stroke="${LEAD_FRAME}" stroke-width="${(spec.leadWidth * 2.2).toFixed(2)}" stroke-linejoin="round"/>`)
    .join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.width} ${frame.height}" width="${frame.width}" height="${frame.height}">
  <title>${escapeXml(spec.title)} — VITRAIL, seed “${escapeXml(spec.genome.seed)}”</title>
  <rect width="${frame.width}" height="${frame.height}" fill="${BACKDROP}"/>
  <g>
    <path d="${frame.outline}" fill="#060409"/>
    ${panes}
    ${lead}
  </g>
</svg>
`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function exportFilename(spec: WindowSpec, ext: 'svg' | 'png'): string {
  const slug = spec.genome.seed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'window'
  return `vitrail-${slug}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadSvg(spec: WindowSpec): void {
  downloadBlob(new Blob([buildSvgMarkup(spec)], { type: 'image/svg+xml' }), exportFilename(spec, 'svg'))
}
