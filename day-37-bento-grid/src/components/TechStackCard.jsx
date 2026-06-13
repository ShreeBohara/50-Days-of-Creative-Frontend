import { motion } from 'framer-motion'
import BentoCard from './BentoCard'
import { technologies } from '../data/portfolioData'

function TechStackCard() {
  return (
    <BentoCard area="stack" className="stack-card" label="Technology stack">
      <div className="stack-heading">
        <span className="eyebrow">Tools in orbit</span>
        <strong>Stack / 08</strong>
      </div>
      <div className="tech-grid">
        {technologies.map(({ name, icon: Icon, color }, index) => (
          <motion.div
            className="tech-item"
            title={name}
            aria-label={name}
            whileHover={{
              rotate: index % 2 === 0 ? [0, -8, 7, -3, 0] : [0, 8, -7, 3, 0],
              y: -4,
              transition: { duration: 0.42 },
            }}
            key={name}
          >
            <Icon style={{ color }} aria-hidden="true" />
            <span>{name}</span>
          </motion.div>
        ))}
      </div>
    </BentoCard>
  )
}

export default TechStackCard
