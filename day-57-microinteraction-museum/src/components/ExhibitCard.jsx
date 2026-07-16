import { useState } from 'react'
import { motion } from 'motion/react'
import { ReplayIcon } from './Icons.jsx'

export function ExhibitCard({ number, title, caption, hint, children, tone = 'paper' }) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <motion.article
      className={`exhibit-card exhibit-card--${tone}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.48, delay: Number(number) % 2 ? 0 : 0.06 }}
    >
      <header className="exhibit-card__header">
        <div>
          <span className="exhibit-card__eyebrow">Exhibit {number}</span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button replay-button"
          type="button"
          aria-label={`Replay ${title}`}
          onClick={() => setReplayKey((value) => value + 1)}
        >
          <ReplayIcon />
        </button>
      </header>

      <div className="exhibit-card__stage" data-stage={number}>
        {children({ replayKey })}
      </div>

      <footer className="exhibit-card__plaque">
        <p>{caption}</p>
        <span>{hint}</span>
      </footer>
    </motion.article>
  )
}
