import type { WindowSpec } from '../domain/compose'
import { buildSvgMarkup, downloadBlob, exportFilename } from './exportSvg'

const SCALE = 2

// Rasterize the standalone SVG through an offscreen <img> + canvas.
export async function downloadPng(spec: WindowSpec): Promise<void> {
  const svgBlob = new Blob([buildSvgMarkup(spec)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = spec.frame.width * SCALE
    canvas.height = spec.frame.height * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('png encode failed')
    downloadBlob(png, exportFilename(spec, 'png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('svg image failed to load'))
    img.src = src
  })
}
