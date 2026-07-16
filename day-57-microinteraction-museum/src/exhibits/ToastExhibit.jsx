import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  MAX_VISIBLE_TOASTS,
  TOAST_DURATION_MS,
  createToast,
  dismissToast,
  enqueueToast,
  seedToastQueue,
  splitToastQueue,
  tickVisibleToasts,
} from '../lib/toastQueue.js'
import './ToastExhibit.css'

const SWIPE_DISTANCE = 76
const SWIPE_VELOCITY = 550

function ToastGlyph({ name }) {
  const paths = {
    archive: <><path d="M12 4v10m-4-4 4 4 4-4" /><path d="M5 16v3h14v-3" /></>,
    note: <><path d="M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" /></>,
    play: <path d="m9 7 8 5-8 5Z" />,
    check: <path d="m6 12 4 4 8-9" />,
    dot: <circle cx="12" cy="12" r="5" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function ToastCard({ toast, index, expanded, onDismiss, onHoverChange }) {
  const reducedMotion = useReducedMotion()
  const progress = Math.max(0, Math.min(1, toast.remainingMs / TOAST_DURATION_MS))
  const collapsedY = index * -12
  const expandedY = index * -86

  return (
    <motion.div
      className={`museum-toast museum-toast--${toast.tone}`}
      role="group"
      aria-label={`${toast.title}. ${toast.detail}`}
      style={{ zIndex: MAX_VISIBLE_TOASTS - index }}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.94 }}
      animate={{
        opacity: expanded ? 1 : 1 - index * 0.12,
        x: 0,
        y: expanded ? expandedY : collapsedY,
        scale: expanded ? 1 : 1 - index * 0.045,
      }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 110, scale: 0.92 }}
      transition={reducedMotion
        ? { duration: 0.12 }
        : { type: 'spring', stiffness: 470, damping: 36, mass: 0.72 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.72}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) >= SWIPE_DISTANCE || Math.abs(info.velocity.x) >= SWIPE_VELOCITY) {
          onDismiss(toast.id)
        }
      }}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
    >
      <span className="museum-toast__glyph"><ToastGlyph name={toast.glyph} /></span>
      <span className="museum-toast__copy">
        <span className="museum-toast__eyebrow">{toast.eyebrow}</span>
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
      </span>
      <button
        type="button"
        className="museum-toast__close"
        aria-label={`Dismiss ${toast.title}`}
        onClick={() => onDismiss(toast.id)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
          <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span className="museum-toast__timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
    </motion.div>
  )
}

function ToastPortal({ queue, onDismiss, onPausedChange }) {
  const [expanded, setExpanded] = useState(false)
  const pauseReasonsRef = useRef({ hovered: false, focused: false, pageHidden: document.hidden })
  const { visible, overflowCount } = splitToastQueue(queue)

  const updatePauseReason = useCallback((reason, value) => {
    pauseReasonsRef.current[reason] = value
    const { hovered, focused, pageHidden } = pauseReasonsRef.current
    setExpanded(hovered || focused)
    onPausedChange(hovered || focused || pageHidden)
  }, [onPausedChange])

  useEffect(() => {
    const onVisibilityChange = () => updatePauseReason('pageHidden', document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [updatePauseReason])

  return createPortal(
    <div className="toast-portal" aria-live="off">
      <section
        className="toast-stack"
        aria-label="Museum notifications"
        data-expanded={expanded || undefined}
        data-paused={expanded || undefined}
        onFocusCapture={() => updatePauseReason('focused', true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) updatePauseReason('focused', false)
        }}
      >
        <AnimatePresence initial={false}>
          {visible.map((toast, index) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              index={index}
              expanded={expanded}
              onDismiss={onDismiss}
              onHoverChange={(value) => updatePauseReason('hovered', value)}
            />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {overflowCount > 0 && (
            <motion.span
              key="overflow"
              className="toast-stack__overflow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: expanded ? visible.length * -86 - 14 : visible.length * -12 - 38,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              +{overflowCount} more
            </motion.span>
          )}
        </AnimatePresence>
      </section>
    </div>,
    document.body,
  )
}

export function ToastExhibit() {
  const [queue, setQueue] = useState(() => seedToastQueue(2))
  const [announcement, setAnnouncement] = useState('')
  const pausedRef = useRef(false)
  const nextIdRef = useRef(3)
  const sampleIndexRef = useRef(2)

  const handlePausedChange = useCallback((value) => {
    pausedRef.current = value
  }, [])

  useEffect(() => {
    if (queue.length === 0) return undefined

    let previousTick = performance.now()
    const timer = window.setInterval(() => {
      const currentTick = performance.now()
      const elapsed = currentTick - previousTick
      previousTick = currentTick
      if (!pausedRef.current) setQueue((current) => tickVisibleToasts(current, elapsed))
    }, 50)

    return () => window.clearInterval(timer)
  }, [queue.length])

  const addToast = () => {
    const toast = createToast(sampleIndexRef.current, nextIdRef.current)
    sampleIndexRef.current += 1
    nextIdRef.current += 1
    setQueue((current) => enqueueToast(current, toast))
    setAnnouncement(`New notification: ${toast.title}. ${toast.detail}`)
  }

  const removeToast = (toastId) => {
    setQueue((current) => dismissToast(current, toastId))
  }

  const { visible, overflowCount } = splitToastQueue(queue)

  return (
    <div className="toast-exhibit">
      <div className="toast-exhibit__ticket" aria-hidden="true">
        <span>LIVE QUEUE</span>
        <strong>{String(queue.length).padStart(2, '0')}</strong>
        <i />
      </div>
      <div className="toast-exhibit__copy">
        <p id="toast-demo-summary">
          Three notices occupy the wall. The rest wait without losing time.
        </p>
        <button
          type="button"
          className="toast-exhibit__trigger"
          aria-describedby="toast-demo-summary"
          onClick={addToast}
        >
          <span>Send a toast</span>
          <span aria-hidden="true">{visible.length}/3 {overflowCount > 0 ? `+${overflowCount}` : '↗'}</span>
        </button>
        <span className="toast-exhibit__instruction">Appears at the lower-right edge</span>
      </div>

      <span className="toast-exhibit__live" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <ToastPortal queue={queue} onDismiss={removeToast} onPausedChange={handlePausedChange} />
    </div>
  )
}
