import { motion } from 'framer-motion'
import { useEffect } from 'react'

/**
 * Reusable page-level transition wrapper.
 * Wraps every page with enter/exit Framer Motion animations.
 */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 24,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 1, 1],
    },
  },
}

export default function PageTransition({ children }) {
  /* scroll to top on mount (new page) */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <motion.div
      className="page-transition"
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
