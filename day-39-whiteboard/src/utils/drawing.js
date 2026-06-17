import { orderElements } from './elements'

function applyStrokeStyle(context, element) {
  context.globalAlpha = element.opacity ?? 1
  context.strokeStyle = element.stroke
  context.fillStyle = element.fill
  context.lineWidth = element.strokeWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (element.strokeStyle === 'dashed') {
    context.setLineDash([element.strokeWidth * 3, element.strokeWidth * 2])
  } else if (element.strokeStyle === 'dotted') {
    context.setLineDash([0.1, element.strokeWidth * 2])
  } else {
    context.setLineDash([])
  }
}

export function drawFreehand(context, element) {
  const points = element.points ?? []

  if (!points.length) {
    return
  }

  applyStrokeStyle(context, element)

  if (points.length === 1) {
    context.beginPath()
    context.arc(points[0].x, points[0].y, Math.max(1, element.strokeWidth / 2), 0, Math.PI * 2)
    context.fillStyle = element.stroke
    context.fill()
    return
  }

  context.beginPath()
  context.moveTo(points[0].x, points[0].y)

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    context.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) / 2,
      (current.y + next.y) / 2,
    )
  }

  const last = points[points.length - 1]
  context.lineTo(last.x, last.y)
  context.stroke()
}

export function drawElement(context, element) {
  if (element.type === 'draw') {
    drawFreehand(context, element)
  }
}

export function drawElements(context, elements, draftElement = null) {
  orderElements(draftElement ? [...elements, draftElement] : elements).forEach((element) => {
    context.save()
    drawElement(context, element)
    context.restore()
  })
}
