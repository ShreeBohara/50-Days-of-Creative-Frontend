import { useEffect, useId, useRef } from 'react'
import type { Palette } from '../domain/palettes'

interface Props {
  d: string
  palette: Palette
  lineWidth: number
  glow: number
  /** Bump to replay the pen-draw animation (live edits keep this stable). */
  drawKey: number
  drawMs: number
  animate: boolean
}

export default function HarmonographCanvas({
  d,
  palette,
  lineWidth,
  glow,
  drawKey,
  drawMs,
  animate,
}: Props) {
  const id = useId().replace(/:/g, '')
  const gradId = `grad-${id}`
  const glowId = `glow-${id}`

  const lineRef = useRef<SVGPathElement>(null)
  const glowRef = useRef<SVGPathElement>(null)
  const tipRef = useRef<SVGCircleElement>(null)
  const animatingRef = useRef(false)
  const drawMsRef = useRef(drawMs)
  useEffect(() => {
    drawMsRef.current = drawMs
  }, [drawMs])

  const showFull = () => {
    for (const path of [lineRef.current, glowRef.current]) {
      if (!path) continue
      path.style.strokeDasharray = 'none'
      path.style.strokeDashoffset = '0'
    }
    if (tipRef.current) tipRef.current.style.opacity = '0'
  }

  // Pen-draw animation — runs only when drawKey changes (or motion toggles).
  useEffect(() => {
    const line = lineRef.current
    const glowPath = glowRef.current
    const tip = tipRef.current
    if (!line) return

    const total = typeof line.getTotalLength === 'function' ? line.getTotalLength() : 0
    if (!animate || total === 0) {
      animatingRef.current = false
      showFull()
      return
    }

    const setOffset = (o: number) => {
      line.style.strokeDashoffset = String(o)
      if (glowPath) glowPath.style.strokeDashoffset = String(o)
    }

    animatingRef.current = true
    line.style.strokeDasharray = String(total)
    if (glowPath) glowPath.style.strokeDasharray = String(total)
    setOffset(total)
    if (tip) tip.style.opacity = '1'

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / drawMsRef.current)
      setOffset(total * (1 - p))
      if (tip && typeof line.getPointAtLength === 'function') {
        const pt = line.getPointAtLength(total * p)
        tip.setAttribute('cx', String(pt.x))
        tip.setAttribute('cy', String(pt.y))
      }
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        animatingRef.current = false
        showFull()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      animatingRef.current = false
    }
  }, [drawKey, animate])

  // Live edits change `d` without replaying — make sure the full figure shows.
  useEffect(() => {
    if (!animatingRef.current) showFull()
  }, [d])

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
        ref={glowRef}
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
        ref={lineRef}
        className="figure__line"
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        ref={tipRef}
        className="figure__pen"
        r={lineWidth * 1.8}
        fill={palette.glow}
        filter={`url(#${glowId})`}
        opacity="0"
      />
    </svg>
  )
}
