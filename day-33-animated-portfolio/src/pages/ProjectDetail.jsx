import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import projects from '../data/projects'
import './ProjectDetail.css'

/* ---------- animation variants ---------- */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const galleryRef = useRef(null)

  const project = projects.find((p) => p.id === id)
  const projectIndex = projects.findIndex((p) => p.id === id)
  const prevProject = projects[projectIndex - 1]
  const nextProject = projects[projectIndex + 1]

  /* parallax for gallery images */
  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start end', 'end start'],
  })
  const y1 = useTransform(scrollYProgress, [0, 1], [40, -40])
  const y2 = useTransform(scrollYProgress, [0, 1], [60, -60])
  const y3 = useTransform(scrollYProgress, [0, 1], [30, -30])

  if (!project) {
    return (
      <div className="page" style={{ paddingTop: '8rem', textAlign: 'center' }}>
        <h1 className="text-h1">Project not found</h1>
        <Link to="/work" style={{ color: 'var(--color-accent)', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Work
        </Link>
      </div>
    )
  }

  const descParagraphs = project.longDescription
    ? project.longDescription.split('\n\n')
    : [project.description]

  return (
    <div className="page detail-page">
      {/* Hero */}
      <section className="detail-hero">
        <motion.div
          className="detail-hero-image"
          layoutId={`project-image-${project.id}`}
          style={{ background: project.gradient }}
          transition={{ layout: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
        />
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link to="/work" className="detail-back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Work
            </Link>
          </motion.div>
          <motion.span
            className="detail-category text-label"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {project.category} — {project.year}
          </motion.span>
          <motion.h1
            className="detail-title text-display"
            style={{ color: 'white' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {project.title}
          </motion.h1>
          <motion.p
            className="detail-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            {project.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Meta bar */}
      <section className="detail-meta container">
        <motion.div
          className="detail-meta-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div className="detail-meta-item" variants={fadeUp} custom={0}>
            <span className="text-label">Role</span>
            <p className="text-body">{project.role}</p>
          </motion.div>
          <motion.div className="detail-meta-item" variants={fadeUp} custom={1}>
            <span className="text-label">Duration</span>
            <p className="text-body">{project.duration}</p>
          </motion.div>
          <motion.div className="detail-meta-item" variants={fadeUp} custom={2}>
            <span className="text-label">Tech Stack</span>
            <div className="detail-tech-pills">
              {project.tech.map((t) => (
                <span key={t} className="detail-pill">{t}</span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Description */}
      <section className="detail-description container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {descParagraphs.map((para, i) => (
            <motion.p
              key={i}
              className="detail-para text-body"
              variants={fadeUp}
              custom={i}
            >
              {para}
            </motion.p>
          ))}
        </motion.div>
      </section>

      {/* Gallery with parallax */}
      <section className="detail-gallery container" ref={galleryRef}>
        <motion.div
          className="detail-gallery-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {project.images.map((img, i) => {
            const yOffset = [y1, y2, y3][i % 3]
            return (
              <motion.div
                key={i}
                className="detail-gallery-item"
                style={{ y: yOffset }}
                variants={fadeUp}
                custom={i}
              >
                <div
                  className="detail-gallery-image"
                  style={{ background: img }}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Next / Prev navigation */}
      <section className="detail-nav container">
        <div className="detail-nav-grid">
          {prevProject ? (
            <Link to={`/project/${prevProject.id}`} className="detail-nav-link detail-nav-prev">
              <span className="text-label">Previous Project</span>
              <span className="detail-nav-title text-h3">{prevProject.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {nextProject ? (
            <Link to={`/project/${nextProject.id}`} className="detail-nav-link detail-nav-next">
              <span className="text-label">Next Project</span>
              <span className="detail-nav-title text-h3">{nextProject.title}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </section>
    </div>
  )
}
