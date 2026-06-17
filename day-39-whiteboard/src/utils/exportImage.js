import { drawElements } from './drawing'
import { boundsFromElement } from './geometry'

function unionBounds(boundsList) {
  if (!boundsList.length) {
    return { x: -500, y: -340, width: 1000, height: 680 }
  }

  const minX = Math.min(...boundsList.map((bounds) => bounds.x))
  const minY = Math.min(...boundsList.map((bounds) => bounds.y))
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width))
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function exportElementsAsPng(elements, filename = 'day-39-whiteboard.png') {
  const padding = 80
  const bounds = unionBounds(elements.map(boundsFromElement))
  const canvas = document.createElement('canvas')
  const ratio = window.devicePixelRatio || 1
  const width = Math.max(800, Math.ceil(bounds.width + (padding * 2)))
  const height = Math.max(600, Math.ceil(bounds.height + (padding * 2)))
  const context = canvas.getContext('2d')

  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.fillStyle = '#f8fffd'
  context.fillRect(0, 0, width, height)
  context.translate(padding - bounds.x, padding - bounds.y)
  drawElements(context, elements)

  const anchor = document.createElement('a')
  anchor.download = filename
  anchor.href = canvas.toDataURL('image/png')
  anchor.click()
}
