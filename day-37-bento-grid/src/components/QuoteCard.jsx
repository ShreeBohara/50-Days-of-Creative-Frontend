import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import BentoCard from './BentoCard'
import { quotes } from '../data/portfolioData'

function QuoteCard() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % quotes.length), 5200)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <BentoCard area="quote" className="quote-card" label={`Quote: ${quotes[index]}`}>
      <Quote size={26} aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.blockquote
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          “{quotes[index]}”
        </motion.blockquote>
      </AnimatePresence>
      <div className="quote-dots" aria-hidden="true">
        {quotes.map((quote, dotIndex) => (
          <span className={dotIndex === index ? 'is-active' : ''} key={quote}></span>
        ))}
      </div>
    </BentoCard>
  )
}

export default QuoteCard
