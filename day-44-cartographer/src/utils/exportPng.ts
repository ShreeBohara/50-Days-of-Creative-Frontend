import { downloadBlob } from './exportSvg'

/** Rasterize an SVG document string into a PNG blob via an offscreen canvas. */
export function svgToPngBlob(svg: string, size = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D context unavailable'))
        return
      }
      ctx.drawImage(image, 0, 0, size, size)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('PNG encoding failed'))
      }, 'image/png')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not rasterize SVG'))
    }
    image.src = url
  })
}

export async function downloadPng(svg: string, filename: string, size = 1600): Promise<void> {
  const blob = await svgToPngBlob(svg, size)
  downloadBlob(blob, filename)
}
