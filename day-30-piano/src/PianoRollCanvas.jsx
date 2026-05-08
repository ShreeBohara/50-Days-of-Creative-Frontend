import { useEffect, useRef } from 'react'
import { NOTES } from './pianoModel'

const NOTE_COUNT = NOTES.length
const TRAIL_MS = 4200

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio || 1

  canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio))
  canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio))

  const context = canvas.getContext('2d')
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  return { context, height: rect.height, width: rect.width }
}

function drawGrid(context, width, height) {
  context.clearRect(0, 0, width, height)

  const columnWidth = width / NOTE_COUNT
  context.fillStyle = '#080915'
  context.fillRect(0, 0, width, height)

  context.strokeStyle = 'rgba(168, 178, 216, 0.08)'
  context.lineWidth = 1

  for (let index = 0; index <= NOTE_COUNT; index += 1) {
    const x = index * columnWidth
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }

  for (let row = 1; row < 4; row += 1) {
    const y = (height / 4) * row
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
}

function drawNotes(context, width, height, notes, now) {
  const columnWidth = width / NOTE_COUNT

  notes.forEach((entry) => {
    const elapsed = now - entry.startedAt

    if (elapsed < 0 || elapsed > TRAIL_MS) {
      return
    }

    const heldMs = Math.max(120, (entry.endedAt ?? now) - entry.startedAt)
    const x = entry.noteIndex * columnWidth + columnWidth * 0.1
    const y = -48 + elapsed * 0.105
    const noteHeight = Math.min(height * 0.72, 24 + heldMs * 0.1)
    const noteWidth = Math.max(5, columnWidth * 0.8)
    const gradient = context.createLinearGradient(0, y, 0, y + noteHeight)

    gradient.addColorStop(0, entry.color)
    gradient.addColorStop(1, 'rgba(248, 250, 252, 0.08)')

    context.shadowColor = entry.color
    context.shadowBlur = entry.source === 'playback' ? 24 : 16
    context.fillStyle = gradient
    context.beginPath()
    context.roundRect(x, y, noteWidth, noteHeight, 6)
    context.fill()
    context.shadowBlur = 0
  })
}

export function PianoRollCanvas({ notes }) {
  const canvasRef = useRef(null)
  const notesRef = useRef(notes)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    let frame = 0
    let dimensions = resizeCanvas(canvas)
    const observer = new ResizeObserver(() => {
      dimensions = resizeCanvas(canvas)
    })

    observer.observe(canvas)

    const render = () => {
      const now = performance.now()

      drawGrid(dimensions.context, dimensions.width, dimensions.height)
      drawNotes(dimensions.context, dimensions.width, dimensions.height, notesRef.current, now)
      frame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas className="piano-roll-canvas" ref={canvasRef} aria-hidden="true" />
}
