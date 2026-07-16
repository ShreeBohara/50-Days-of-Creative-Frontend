import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { CloseIcon } from '../components/Icons.jsx'
import {
  applyDrawerResistance,
  estimatePointerVelocity,
  shouldCloseDrawer,
} from '../lib/drawerPhysics.js'
import './DrawerExhibit.css'

const FOCUSABLE = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function DrawerPortal({ onClose }) {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const dragRef = useRef(null)
  const animationRef = useRef(null)
  const closingRef = useRef(false)
  const reducedMotion = useReducedMotion()
  const y = useMotionValue(typeof window === 'undefined' ? 0 : window.innerHeight)
  const [closing, setClosing] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
  const [metrics, setMetrics] = useState({ offset: 0, velocity: 0 })

  const requestClose = useCallback((velocity = 0) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)

    if (reducedMotion) {
      onClose()
      return
    }

    const target = window.innerHeight + 48
    animationRef.current = animate(y, target, {
      type: 'spring',
      stiffness: 380,
      damping: 38,
      velocity: Math.max(velocity, 0),
    })
    animationRef.current.then(onClose)
  }, [onClose, reducedMotion, y])

  useEffect(() => {
    if (reducedMotion) {
      y.set(0)
      return undefined
    }

    animationRef.current = animate(y, 0, {
      type: 'spring',
      stiffness: 390,
      damping: 38,
      mass: 0.82,
    })

    return () => animationRef.current?.stop()
  }, [reducedMotion, y])

  useEffect(() => {
    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth)

    body.style.overflow = 'hidden'
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [])

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [requestClose])

  const startDrag = (event) => {
    if (event.button !== 0 || closingRef.current) return
    animationRef.current?.stop()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: y.get(),
      samples: [{ y: event.clientY, time: performance.now() }],
    }
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !panelRef.current) return

    const now = performance.now()
    drag.samples.push({ y: event.clientY, time: now })
    drag.samples = drag.samples.filter((sample) => now - sample.time <= 110)

    const rawOffset = drag.startOffset + event.clientY - drag.startY
    const height = panelRef.current.getBoundingClientRect().height
    const resistedOffset = applyDrawerResistance(rawOffset, height)
    y.set(resistedOffset)
    setMetrics((current) => ({ ...current, offset: resistedOffset }))
  }

  const finishDrag = (event, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !panelRef.current) return
    dragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const velocity = estimatePointerVelocity(drag.samples)
    const offset = y.get()
    const height = panelRef.current.getBoundingClientRect().height
    setMetrics({ offset, velocity })

    if (!cancelled && shouldCloseDrawer({ offset, height, velocity })) {
      requestClose(velocity)
      return
    }

    animationRef.current = animate(y, 0, reducedMotion
      ? { duration: 0.1 }
      : { type: 'spring', stiffness: 440, damping: 38, velocity })
  }

  return createPortal(
    <motion.div
      className="drawer-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.2 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <motion.aside
        ref={panelRef}
        className="museum-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby="drawer-description"
        style={{ y }}
      >
        <button
          type="button"
          className="museum-drawer__grip"
          aria-label="Drag down to close the exhibit notes"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
        >
          <span aria-hidden="true" />
        </button>

        <header className="museum-drawer__header">
          <div>
            <span className="museum-drawer__index">Object 02 / Kinetic sheet</span>
            <h2 id="drawer-title">Exhibit notes</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="museum-drawer__close"
            aria-label="Close exhibit notes"
            onClick={() => requestClose()}
          >
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="museum-drawer__body">
          <div className="museum-drawer__essay">
            <p id="drawer-description">
              A convincing sheet borrows your velocity, but never gives up its edge. Pull slowly to inspect the resistance; flick down to leave.
            </p>
            <blockquote>
              “The boundary should feel elastic before it feels broken.”
            </blockquote>
            <dl className="museum-drawer__specimens">
              <div><dt>Release</dt><dd>40% travel</dd></div>
              <div><dt>Fling</dt><dd>700 px/s</dd></div>
              <div><dt>Return</dt><dd>Spring 440</dd></div>
            </dl>
          </div>

          <section className="museum-drawer__settings" aria-labelledby="drawer-settings-title">
            <div className="museum-drawer__settings-head">
              <div>
                <span>Settings panel</span>
                <h3 id="drawer-settings-title">Gesture telemetry</h3>
              </div>
              <button
                type="button"
                className="museum-drawer__switch"
                role="switch"
                aria-checked={showMetrics}
                onClick={() => setShowMetrics((value) => !value)}
              >
                <span aria-hidden="true" />
                <span>{showMetrics ? 'On' : 'Off'}</span>
              </button>
            </div>

            {showMetrics ? (
              <motion.dl
                className="museum-drawer__metrics"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div><dt>Travel</dt><dd>{Math.max(0, Math.round(metrics.offset))} px</dd></div>
                <div><dt>Velocity</dt><dd>{Math.round(metrics.velocity)} px/s</dd></div>
              </motion.dl>
            ) : (
              <p className="museum-drawer__metrics-off">The mechanism keeps moving; only the labels rest.</p>
            )}
          </section>
        </div>

        <footer className="museum-drawer__footer">
          <span>Drag the handle, press Escape, or</span>
          <button type="button" onClick={() => requestClose()}>Return to gallery ↑</button>
        </footer>
      </motion.aside>
    </motion.div>,
    document.body,
  )
}

export function DrawerExhibit({ onOpenChange, replayKey = 0 }) {
  const [open, setOpen] = useState(() => replayKey > 0)
  const openButtonRef = useRef(null)
  const returnFocusRef = useRef(null)
  const restoreTimerRef = useRef(null)

  useEffect(() => {
    onOpenChange?.(open)
    return () => {
      if (open) onOpenChange?.(false)
    }
  }, [onOpenChange, open])

  useEffect(() => () => window.clearTimeout(restoreTimerRef.current), [])

  useEffect(() => {
    if (open && !returnFocusRef.current) returnFocusRef.current = document.activeElement
  }, [open])

  const openDrawer = () => {
    returnFocusRef.current = document.activeElement
    setOpen(true)
  }

  const closeDrawer = () => {
    setOpen(false)
    window.clearTimeout(restoreTimerRef.current)
    restoreTimerRef.current = window.setTimeout(() => {
      const returnTarget = returnFocusRef.current
      if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus()
      else openButtonRef.current?.focus()
      returnFocusRef.current = null
    }, 0)
  }

  return (
    <div className="drawer-exhibit">
      <div className="drawer-exhibit__diagram" aria-hidden="true">
        <span className="drawer-exhibit__track" />
        <span className="drawer-exhibit__threshold">40%</span>
        <motion.span
          className="drawer-exhibit__sheet"
          initial={{ y: 32 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 24, delay: 0.1 }}
        >
          <i />
          <b>DRAG / RELEASE</b>
        </motion.span>
      </div>
      <div className="drawer-exhibit__copy">
        <span>Resistance study no. 02</span>
        <p>A sheet that knows the difference between hesitation and intent.</p>
        <motion.button
          ref={openButtonRef}
          type="button"
          className="drawer-exhibit__trigger"
          onClick={openDrawer}
          whileTap={{ scale: 0.97 }}
        >
          Open the drawer <span aria-hidden="true">↗</span>
        </motion.button>
      </div>
      {open && <DrawerPortal onClose={closeDrawer} />}
    </div>
  )
}
