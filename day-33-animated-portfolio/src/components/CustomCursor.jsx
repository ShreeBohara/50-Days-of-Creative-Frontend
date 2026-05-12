import { useEffect, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import './CustomCursor.css'

/**
 * Custom cursor — 30px blend-mode circle that follows the mouse.
 * Scales up on interactive elements, shows "View" text on project cards.
 * Hidden on touch devices.
 */
export default function CustomCursor() {
  const [cursorLabel, setCursorLabel] = useState('')
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  /* smooth spring follow */
  const springConfig = { damping: 25, stiffness: 350, mass: 0.5 }
  const cursorX = useSpring(mouseX, springConfig)
  const cursorY = useSpring(mouseY, springConfig)

  /* detect touch device */
  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(touch)
  }, [])

  /* mouse move handler */
  const onMouseMove = useCallback(
    (e) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!isVisible) setIsVisible(true)
    },
    [mouseX, mouseY, isVisible],
  )

  /* mouse leave / enter */
  const onMouseLeave = useCallback(() => setIsVisible(false), [])
  const onMouseEnter = useCallback(() => setIsVisible(true), [])

  /* hover detection via event delegation */
  const onMouseOver = useCallback((e) => {
    const target = e.target.closest(
      'a, button, [data-cursor="view"], [data-cursor="link"], input, textarea, select',
    )
    if (target) {
      setIsHovering(true)
      const label = target.getAttribute('data-cursor')
      if (label === 'view') setCursorLabel('View')
      else if (label === 'link') setCursorLabel('↗')
      else setCursorLabel('')
    } else {
      setIsHovering(false)
      setCursorLabel('')
    }
  }, [])

  useEffect(() => {
    if (isTouchDevice) return

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)
    document.addEventListener('mouseover', onMouseOver)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
      document.removeEventListener('mouseover', onMouseOver)
    }
  }, [isTouchDevice, onMouseMove, onMouseLeave, onMouseEnter, onMouseOver])

  if (isTouchDevice) return null

  return (
    <motion.div
      className={`custom-cursor ${isHovering ? 'custom-cursor--hover' : ''} ${
        cursorLabel ? 'custom-cursor--label' : ''
      }`}
      style={{
        x: cursorX,
        y: cursorY,
        opacity: isVisible ? 1 : 0,
      }}
      animate={{
        scale: isHovering ? 2.2 : 1,
      }}
      transition={{ scale: { type: 'spring', stiffness: 400, damping: 28 } }}
    >
      {cursorLabel && <span className="custom-cursor-text">{cursorLabel}</span>}
    </motion.div>
  )
}
