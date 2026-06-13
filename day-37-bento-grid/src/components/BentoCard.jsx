import { forwardRef } from 'react'

const BentoCard = forwardRef(function BentoCard(
  { area, as: Element = 'article', className = '', label, children, ...props },
  ref,
) {
  return (
    <Element
      ref={ref}
      className={`bento-card ${className}`.trim()}
      data-area={area}
      aria-label={label}
      {...props}
    >
      {children}
    </Element>
  )
})

export default BentoCard
