import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import {
  HOLD_PHASE,
  HOLD_REWIND_MS,
  getCrossedHoldMilestones,
  getHoldProgress,
  getNextHoldPhase,
} from '../lib/holdConfirm.js'
import './HoldConfirmExhibit.css'

const KEYBOARD_HOLD_KEYS = new Set([' ', 'Enter'])

function getButtonOrigin(element, clientX, clientY) {
  const bounds = element.getBoundingClientRect()
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY) || !bounds.width || !bounds.height) {
    return { x: 50, y: 50 }
  }

  return {
    x: Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100)),
    y: Math.min(100, Math.max(0, ((clientY - bounds.top) / bounds.height) * 100)),
  }
}

export function HoldConfirmExhibit() {
  const [phase, setPhase] = useState(HOLD_PHASE.idle)
  const [progress, setProgress] = useState(0)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const phaseRef = useRef(HOLD_PHASE.idle)
  const progressRef = useRef(0)
  const frameRef = useRef(0)
  const startRef = useRef(0)
  const reducedMotion = useReducedMotion()
  const buttonControls = useAnimationControls()

  const changePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  const updateProgress = useCallback((nextProgress) => {
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [])

  const stopFrame = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
  }, [])

  const playMilestone = useCallback(() => {
    if (reducedMotion) return
    buttonControls.start({
      x: [0, -4, 4, -2, 2, 0],
      transition: { duration: 0.18, ease: 'easeOut' },
    })
  }, [buttonControls, reducedMotion])

  const completeHold = useCallback(() => {
    stopFrame()
    updateProgress(1)
    changePhase(getNextHoldPhase(phaseRef.current, 'complete'))
    buttonControls.start(reducedMotion
      ? { opacity: [0.72, 1], transition: { duration: 0.16 } }
      : { scale: [1, 0.94, 1.08, 1], transition: { duration: 0.42, times: [0, 0.22, 0.58, 1] } })
  }, [buttonControls, changePhase, reducedMotion, stopFrame, updateProgress])

  const beginHold = useCallback((element, clientX, clientY) => {
    const nextPhase = getNextHoldPhase(phaseRef.current, 'press')
    if (nextPhase !== HOLD_PHASE.holding || phaseRef.current === HOLD_PHASE.holding) return

    stopFrame()
    updateProgress(0)
    setOrigin(getButtonOrigin(element, clientX, clientY))
    changePhase(nextPhase)
    startRef.current = performance.now()

    const tick = (now) => {
      if (phaseRef.current !== HOLD_PHASE.holding) return
      const nextProgress = getHoldProgress(now - startRef.current)
      const crossed = getCrossedHoldMilestones(progressRef.current, nextProgress)
      updateProgress(nextProgress)
      if (crossed.length) playMilestone()

      if (nextProgress >= 1) {
        completeHold()
      } else {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [changePhase, completeHold, playMilestone, stopFrame, updateProgress])

  const cancelHold = useCallback(() => {
    const nextPhase = getNextHoldPhase(phaseRef.current, 'release')
    if (nextPhase !== HOLD_PHASE.cancelling) return

    stopFrame()
    changePhase(nextPhase)
    const rewindFrom = progressRef.current
    const rewindStarted = performance.now()

    const rewind = (now) => {
      if (phaseRef.current !== HOLD_PHASE.cancelling) return
      const elapsed = Math.min(1, Math.max(0, (now - rewindStarted) / HOLD_REWIND_MS))
      const eased = 1 - ((1 - elapsed) ** 3)
      updateProgress(rewindFrom * (1 - eased))

      if (elapsed >= 1) {
        updateProgress(0)
        changePhase(getNextHoldPhase(phaseRef.current, 'rewind'))
        frameRef.current = 0
      } else {
        frameRef.current = requestAnimationFrame(rewind)
      }
    }

    frameRef.current = requestAnimationFrame(rewind)
  }, [changePhase, stopFrame, updateProgress])

  useEffect(() => stopFrame, [stopFrame])

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    beginHold(event.currentTarget, event.clientX, event.clientY)
  }

  const handleKeyDown = (event) => {
    if (!KEYBOARD_HOLD_KEYS.has(event.key) || event.repeat) return
    event.preventDefault()
    beginHold(event.currentTarget)
  }

  const handleKeyUp = (event) => {
    if (!KEYBOARD_HOLD_KEYS.has(event.key)) return
    event.preventDefault()
    cancelHold()
  }

  const percentage = Math.round(progress * 100)
  const isComplete = phase === HOLD_PHASE.complete

  return (
    <div className="hold-confirm">
      <motion.button
        className="hold-confirm__button"
        type="button"
        animate={buttonControls}
        data-phase={phase}
        aria-label={isComplete ? 'Draft erased' : 'Hold to erase draft'}
        aria-describedby="hold-confirm-instruction"
        aria-disabled={isComplete}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={cancelHold}
      >
        <span
          className="hold-confirm__fill"
          aria-hidden="true"
          style={{ clipPath: `circle(${progress * 150}% at ${origin.x}% ${origin.y}%)` }}
        />
        <span className="hold-confirm__content">
          <span className="hold-confirm__label">
            {isComplete ? 'Draft erased' : phase === HOLD_PHASE.holding ? 'Keep holding' : 'Hold to erase draft'}
          </span>
          <span className="hold-confirm__duration" aria-hidden="true">
            {isComplete ? 'Complete' : `${percentage}%`}
          </span>
        </span>
        <svg className="hold-confirm__meter" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" pathLength="100" />
          <motion.circle
            className="hold-confirm__meter-progress"
            cx="24"
            cy="24"
            r="20"
            pathLength="100"
            style={{ pathLength: progress }}
          />
          {isComplete && <motion.path d="m16 24 5 5 11-12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />}
        </svg>
      </motion.button>

      <p id="hold-confirm-instruction" className="hold-confirm__instruction">
        Press without interruption for 1.2 seconds
      </p>
      <span className="sr-only" aria-live="polite">
        {isComplete ? 'Draft erased successfully' : phase === HOLD_PHASE.cancelling ? 'Hold cancelled' : ''}
      </span>
    </div>
  )
}
