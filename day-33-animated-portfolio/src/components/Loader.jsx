import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Loader.css'

/**
 * Branded loader shown once on initial page load.
 * Text draws itself via SVG stroke animation, then slides up to reveal the page.
 */
export default function Loader({ onComplete }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
      if (onComplete) onComplete()
    }, 2400)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loader"
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="loader-content">
            {/* SVG text with stroke-draw animation */}
            <svg
              className="loader-svg"
              viewBox="0 0 400 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Portfolio"
            >
              <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                className="loader-text"
              >
                Portfolio
              </text>
            </svg>

            {/* loading bar */}
            <div className="loader-bar-track">
              <motion.div
                className="loader-bar-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
