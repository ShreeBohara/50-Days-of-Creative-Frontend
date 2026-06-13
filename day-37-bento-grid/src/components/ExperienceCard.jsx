import { motion } from 'framer-motion'
import BentoCard from './BentoCard'
import { experience } from '../data/portfolioData'

function ExperienceCard() {
  return (
    <BentoCard area="experience" className="experience-card" label="Experience timeline">
      <div className="experience-heading">
        <span className="eyebrow">Field notes</span>
        <strong>03 chapters</strong>
      </div>
      <div className="timeline">
        <motion.span
          className="timeline-line"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        ></motion.span>
        {experience.map((item, index) => (
          <motion.div
            className="timeline-item"
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.18 + index * 0.12 }}
            key={`${item.year}-${item.title}`}
          >
            <span className="timeline-dot" aria-hidden="true"></span>
            <span className="timeline-year">{item.year}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </motion.div>
        ))}
      </div>
    </BentoCard>
  )
}

export default ExperienceCard
