import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Magnetic button that subtly follows the mouse within its bounds.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.as] - 'a' | 'button' (default: 'button')
 * @param {number} [props.strength] - magnetic pull strength (default: 0.3)
 */
export default function MagneticButton({
  children,
  className = '',
  as = 'button',
  strength = 0.3,
  ...rest
}) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * strength
    const y = (e.clientY - rect.top - rect.height / 2) * strength
    setPosition({ x, y })
  }

  const handleLeave = () => setPosition({ x: 0, y: 0 })

  const Tag = as === 'a' ? motion.a : motion.button

  return (
    <Tag
      ref={ref}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 250, damping: 20, mass: 0.5 }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
