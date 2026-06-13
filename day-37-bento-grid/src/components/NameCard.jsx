import { ArrowUpRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import BentoCard from './BentoCard'
import { identity, links } from '../data/portfolioData'

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.16 + index * 0.08, duration: 0.48, ease: [0.16, 1, 0.3, 1] },
  }),
}

function NameCard() {
  return (
    <BentoCard area="name" className="name-card" label="Introduction">
      <div className="name-topline">
        <span className="eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          Portfolio signal / 037
        </span>
        <span className="name-availability">Currently experimenting</span>
      </div>

      <div className="name-copy">
        <h1 aria-label={identity.name}>
          {identity.name.split(' ').map((word, index) => (
            <motion.span
              initial="hidden"
              animate="visible"
              custom={index}
              variants={wordVariants}
              key={word}
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5 }}
        >
          {identity.tagline}
        </motion.p>
      </div>

      <a className="name-link" href={links.repository} target="_blank" rel="noreferrer">
        Explore the daily lab
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </BentoCard>
  )
}

export default NameCard
