import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  SMART_BUTTON_LABELS,
  SMART_BUTTON_TIMINGS,
} from '../lib/smartButtonState.js'
import './SmartButtonExhibit.css'

const FALLBACK_WIDTHS = {
  idle: 190,
  loading: 158,
  success: 158,
}

const PHASE_STYLE = {
  idle: { backgroundColor: '#171714', borderRadius: 12 },
  loading: { backgroundColor: '#1746e8', borderRadius: 999 },
  success: { backgroundColor: '#1a7549', borderRadius: 999 },
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="smart-button__spinner" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3a7 7 0 0 1 6.2 3.75" />
    </svg>
  )
}

function CheckIcon({ animate = true }) {
  const Path = animate ? motion.path : 'path'

  return (
    <svg className="smart-button__check" viewBox="0 0 20 20" aria-hidden="true">
      <Path
        d="m4.5 10.5 3.4 3.4 7.8-8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        {...(animate && {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { duration: 0.42, ease: 'easeOut' }, opacity: { duration: 0.08 } },
        })}
      />
    </svg>
  )
}

function PhaseContent({ phase, measuring = false }) {
  return (
    <span className="smart-button__content">
      {phase === 'idle' && <ArrowIcon />}
      {phase === 'loading' && <SpinnerIcon />}
      {phase === 'success' && <CheckIcon animate={!measuring} />}
      <span>{SMART_BUTTON_LABELS[phase]}</span>
    </span>
  )
}

export function SmartButtonExhibit({ replayKey = 0 }) {
  const autoStart = replayKey > 0
  const [phase, setPhase] = useState(autoStart ? 'loading' : 'idle')
  const [widths, setWidths] = useState(FALLBACK_WIDTHS)
  const busyRef = useRef(autoStart)
  const timersRef = useRef([])
  const measureRefs = useRef({})
  const reducedMotion = useReducedMotion()

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const scheduleCompletion = useCallback(() => {
    clearTimers()
    timersRef.current = [
      window.setTimeout(() => {
        setPhase('success')
      }, SMART_BUTTON_TIMINGS.loading),
      window.setTimeout(() => {
        setPhase('idle')
        busyRef.current = false
        timersRef.current = []
      }, SMART_BUTTON_TIMINGS.loading + SMART_BUTTON_TIMINGS.success),
    ]
  }, [clearTimers])

  const startCycle = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setPhase('loading')
    scheduleCompletion()
  }, [scheduleCompletion])

  useEffect(() => {
    if (autoStart) scheduleCompletion()
    return () => {
      clearTimers()
      busyRef.current = false
    }
  }, [autoStart, clearTimers, scheduleCompletion])

  useLayoutEffect(() => {
    const measure = () => {
      const nextWidths = Object.fromEntries(
        Object.entries(measureRefs.current).map(([key, element]) => [
          key,
          Math.ceil(element.getBoundingClientRect().width),
        ]),
      )

      if (Object.values(nextWidths).every((value) => value > 0)) {
        setWidths((current) => (
          Object.keys(nextWidths).every((key) => current[key] === nextWidths[key])
            ? current
            : nextWidths
        ))
      }
    }

    const frame = window.requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    Object.values(measureRefs.current).forEach((element) => observer.observe(element))

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const transition = reducedMotion
    ? { duration: 0.08 }
    : { type: 'spring', stiffness: 430, damping: 31, mass: 0.78 }

  return (
    <div className="smart-button-study">
      <div className="smart-button-study__meta" aria-hidden="true">
        <span>State / {phase === 'idle' ? 'Ready' : phase}</span>
        <span className="smart-button-study__signal"><i data-phase={phase} /> Live specimen</span>
      </div>

      <div className="smart-button-study__field">
        <div className="smart-button-study__orbit" aria-hidden="true">
          <span>01</span><span>02</span><span>03</span>
        </div>

        <motion.button
          className="smart-button"
          type="button"
          aria-label={SMART_BUTTON_LABELS[phase]}
          aria-busy={phase === 'loading'}
          aria-disabled={phase !== 'idle'}
          onClick={startCycle}
          animate={{ width: widths[phase], ...PHASE_STYLE[phase] }}
          transition={transition}
          whileTap={phase === 'idle' && !reducedMotion ? { scale: 0.97 } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              className="smart-button__phase"
              key={phase}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -7 }}
              transition={{ duration: reducedMotion ? 0.06 : 0.18 }}
            >
              <PhaseContent phase={phase} />
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <span className="sr-only" role="status" aria-live="polite">
          {SMART_BUTTON_LABELS[phase]}
        </span>
      </div>

      <div className="smart-button-study__timeline" aria-hidden="true">
        <span data-active={phase === 'idle'}>Ready</span>
        <i />
        <span data-active={phase === 'loading'}>900 ms</span>
        <i />
        <span data-active={phase === 'success'}>1.4 s</span>
      </div>

      <div className="smart-button__measure-rack" aria-hidden="true">
        {Object.keys(SMART_BUTTON_LABELS).map((state) => (
          <span
            className="smart-button__measure-item"
            key={state}
            ref={(node) => {
              if (node) measureRefs.current[state] = node
            }}
          >
            <PhaseContent phase={state} measuring />
          </span>
        ))}
      </div>
    </div>
  )
}
