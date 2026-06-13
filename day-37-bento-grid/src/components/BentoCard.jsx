import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const cardOrder = {
  name: 0,
  clock: 1,
  theme: 2,
  featured: 3,
  stack: 4,
  location: 5,
  github: 6,
  experience: 7,
  spotify: 8,
  quote: 9,
  photo: 10,
  contact: 11,
}

const BentoCard = forwardRef(function BentoCard(
  { area, as: Element = 'article', className = '', label, children, ...props },
  ref,
) {
  const MotionElement = Element === 'button' ? motion.button : motion.article

  return (
    <MotionElement
      ref={ref}
      className={`bento-card ${className}`.trim()}
      data-area={area}
      aria-label={label}
      initial={{ opacity: 0, y: 24, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.06 + cardOrder[area] * 0.045,
        duration: 0.52,
        ease: [0.16, 1, 0.3, 1],
      }}
      {...props}
    >
      {children}
    </MotionElement>
  )
})

export default BentoCard
