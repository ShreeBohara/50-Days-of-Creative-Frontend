import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ExternalLink, X } from 'lucide-react'
import { motion } from 'framer-motion'
import BentoCard from './BentoCard'
import { featuredProject, links } from '../data/portfolioData'

function ProjectVisual() {
  return (
    <div className="project-visual" aria-hidden="true">
      <div className="project-browser">
        <div className="browser-bar">
          <span></span><span></span><span></span>
          <em>creative.frontend/day-37</em>
        </div>
        <div className="browser-stage">
          <div className="preview-title">
            <span>50</span>
            <strong>DAYS</strong>
          </div>
          <div className="preview-grid">
            {Array.from({ length: 12 }, (_, index) => (
              <span style={{ '--index': index }} key={index}></span>
            ))}
          </div>
        </div>
      </div>
      <div className="project-scanline"></div>
    </div>
  )
}

function ProjectModal({ onClose }) {
  const modalRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = modalRef.current?.querySelectorAll('button, a[href]')
      if (!focusable?.length) return
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

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        ref={modalRef}
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Close project details">
          <X size={19} aria-hidden="true" />
        </button>
        <div className="modal-visual"><ProjectVisual /></div>
        <div className="modal-copy">
          <span className="eyebrow">{featuredProject.eyebrow}</span>
          <h2 id="project-modal-title">{featuredProject.title}</h2>
          <p>{featuredProject.summary} Each day explores a focused interaction and ships as its own live experiment.</p>
          <div className="project-metrics">
            {featuredProject.metrics.map(([value, label]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
          <div className="modal-actions">
            <a href={links.gallery} target="_blank" rel="noreferrer">Open live gallery <ExternalLink size={16} /></a>
            <a href={links.repository} target="_blank" rel="noreferrer">View source <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FeaturedProjectCard() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeModal = () => {
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      <BentoCard
        ref={triggerRef}
        as="button"
        type="button"
        area="featured"
        className="featured-card"
        label="Open featured project details"
        onClick={() => setIsOpen(true)}
      >
        <div className="featured-copy">
          <span className="eyebrow">{featuredProject.eyebrow}</span>
          <h2>{featuredProject.title}</h2>
          <p>{featuredProject.summary}</p>
        </div>
        <span className="featured-action">View case study <ArrowUpRight size={17} /></span>
        <ProjectVisual />
      </BentoCard>
      {isOpen && <ProjectModal onClose={closeModal} />}
    </>
  )
}

export default FeaturedProjectCard
