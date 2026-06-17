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

export function drawLinearElement(context, element) {
  applyStrokeStyle(context, element)
  context.beginPath()
  context.moveTo(element.x1, element.y1)
  context.lineTo(element.x2, element.y2)
  context.stroke()

  if (element.type !== 'arrow') {
    return
  }

  const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1)
  const length = Math.max(12, element.strokeWidth * 4)

  context.setLineDash([])
  context.beginPath()
  context.moveTo(element.x2, element.y2)
  context.lineTo(
    element.x2 - (Math.cos(angle - Math.PI / 7) * length),
    element.y2 - (Math.sin(angle - Math.PI / 7) * length),
  )
  context.moveTo(element.x2, element.y2)
  context.lineTo(
    element.x2 - (Math.cos(angle + Math.PI / 7) * length),
    element.y2 - (Math.sin(angle + Math.PI / 7) * length),
  )
  context.stroke()
}

export function drawRectangle(context, element) {
  applyStrokeStyle(context, element)

  if (element.fill !== 'transparent') {
    context.fillRect(element.x, element.y, element.width, element.height)
  }

  context.strokeRect(element.x, element.y, element.width, element.height)
}

export function drawEllipse(context, element) {
  applyStrokeStyle(context, element)
  context.beginPath()
  context.ellipse(
    element.x + (element.width / 2),
    element.y + (element.height / 2),
    Math.max(0.5, element.width / 2),
    Math.max(0.5, element.height / 2),
    0,
    0,
    Math.PI * 2,
  )

  if (element.fill !== 'transparent') {
    context.fill()
  }

  context.stroke()
}

export function drawElement(context, element) {
  if (element.type === 'draw') {
    drawFreehand(context, element)
  } else if (element.type === 'line' || element.type === 'arrow') {
    drawLinearElement(context, element)
  } else if (element.type === 'rectangle') {
    drawRectangle(context, element)
  } else if (element.type === 'ellipse') {
    drawEllipse(context, element)
  }
}

export function drawElements(context, elements, draftElement = null) {
  orderElements(draftElement ? [...elements, draftElement] : elements).forEach((element) => {
    context.save()
    drawElement(context, element)
    context.restore()
  })
}
