import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import projects from '../data/projects'
import './Work.css'

/* ---------- animation variants ---------- */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Work() {
  return (
    <div className="page work-page">
      <div className="container">
        {/* header */}
        <motion.div
          className="work-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-label">Selected Projects</span>
          <h1 className="text-h1">Work</h1>
          <p className="work-subtitle text-body">
            A curated collection of projects exploring motion, interaction, and visual storytelling.
          </p>
        </motion.div>

        {/* project grid */}
        <motion.div
          className="work-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project, index) => (
            <motion.div key={project.id} variants={cardVariants}>
              <Link
                to={`/project/${project.id}`}
                className="work-card"
                data-cursor="view"
              >
                {/* thumbnail */}
                <div className="work-card-thumb">
                  <motion.div
                    className="work-card-image"
                    layoutId={`project-image-${project.id}`}
                    style={{ background: project.gradient }}
                    transition={{ layout: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                  />
                  {/* hover overlay */}
                  <div className="work-card-overlay">
                    <span className="work-card-view">View Project</span>
                  </div>
                </div>

                {/* info */}
                <div className="work-card-info">
                  <div className="work-card-meta">
                    <span className="text-label">{project.category}</span>
                    <span className="text-small">{project.year}</span>
                  </div>
                  <h2 className="work-card-title text-h3">{project.title}</h2>
                  <p className="work-card-desc text-small">{project.subtitle}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
