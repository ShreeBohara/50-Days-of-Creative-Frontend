function BentoCard({ area, as: Element = 'article', className = '', label, children, ...props }) {
  return (
    <Element
      className={`bento-card ${className}`.trim()}
      data-area={area}
      aria-label={label}
      {...props}
    >
      {children}
    </Element>
  )
}

export default BentoCard
