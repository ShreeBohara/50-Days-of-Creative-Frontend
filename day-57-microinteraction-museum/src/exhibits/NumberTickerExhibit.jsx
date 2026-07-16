import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  TICKER_INITIAL_CENTS,
  TICKER_MAX_CENTS,
  TICKER_MIN_CENTS,
  randomCurrencyCents,
  tokenizeCurrency,
} from '../lib/tickerFormat.js'
import './NumberTickerExhibit.css'

function DigitReel({ character, direction, slot, reducedMotion }) {
  return (
    <motion.span className="number-ticker__digit" layout="position">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.span
          className="number-ticker__glyph"
          key={character}
          custom={direction}
          variants={{
            enter: (travel) => ({ opacity: 0, y: reducedMotion ? 0 : travel * 42 }),
            center: { opacity: 1, y: 0 },
            exit: (travel) => ({ opacity: 0, y: reducedMotion ? 0 : travel * -42 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reducedMotion ? 0.08 : 0.42,
            delay: reducedMotion ? 0 : Math.min(slot, 8) * 0.026,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {character}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}

function StaticToken({ token, reducedMotion }) {
  const isComma = token.type === 'separator'

  return (
    <motion.span
      className={`number-ticker__token number-ticker__token--${token.type}`}
      layout="position"
      initial={isComma ? { opacity: 0, width: 0 } : { opacity: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={isComma ? { opacity: 0, width: 0 } : { opacity: 0 }}
      transition={{
        layout: reducedMotion
          ? { duration: 0.08 }
          : { type: 'spring', stiffness: 420, damping: 37 },
        opacity: { duration: reducedMotion ? 0.06 : 0.18 },
        width: { duration: reducedMotion ? 0.06 : 0.24 },
      }}
    >
      {token.character}
    </motion.span>
  )
}

export function NumberTickerExhibit() {
  const [cents, setCents] = useState(TICKER_INITIAL_CENTS)
  const [directions, setDirections] = useState({})
  const reducedMotion = useReducedMotion()
  const { formatted, tokens } = useMemo(() => tokenizeCurrency(cents), [cents])

  const randomize = () => {
    let nextValue = randomCurrencyCents()
    if (nextValue === cents) {
      nextValue = nextValue === TICKER_MAX_CENTS ? TICKER_MIN_CENTS : nextValue + 1
    }

    const currentDigits = new Map(
      tokens.filter(({ type }) => type === 'digit').map((token) => [token.id, token.character]),
    )
    const nextDigits = tokenizeCurrency(nextValue).tokens.filter(({ type }) => type === 'digit')
    setDirections(Object.fromEntries(nextDigits.map((token) => [
      token.id,
      Number(token.character) >= Number(currentDigits.get(token.id) ?? token.character) ? 1 : -1,
    ])))
    setCents(nextValue)
  }

  return (
    <div className="number-ticker">
      <header className="number-ticker__header" aria-hidden="true">
        <div>
          <span>Collection value</span>
          <strong>USD</strong>
        </div>
        <span className="number-ticker__live"><i /> Live estimate</span>
      </header>

      <div className="number-ticker__display-wrap">
        <div className="number-ticker__ruler" aria-hidden="true">
          <span>MIN 48</span>
          <i />
          <span>MAX 1.25M</span>
        </div>

        <motion.div
          className="number-ticker__display"
          aria-hidden="true"
          layout
          transition={reducedMotion
            ? { duration: 0.08 }
            : { layout: { type: 'spring', stiffness: 390, damping: 36 } }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {tokens.map((token) => (
              token.type === 'digit'
                ? (
                    <DigitReel
                      character={token.character}
                      direction={directions[token.id] ?? 1}
                      key={token.id}
                      slot={token.slot}
                      reducedMotion={reducedMotion}
                    />
                  )
                : <StaticToken key={token.id} token={token} reducedMotion={reducedMotion} />
            ))}
          </AnimatePresence>
        </motion.div>

        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {formatted}
        </span>
      </div>

      <footer className="number-ticker__footer">
        <span aria-hidden="true">Right-aligned digit slots</span>
        <button type="button" onClick={randomize}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6h2.4c2.7 0 3.3 8 6.2 8H17" />
            <path d="m14 11 3 3-3 3M3 14h2.2c1.2 0 2-1.3 2.8-2.9M11.6 6H17M14 3l3 3-3 3" />
          </svg>
          Randomize
        </button>
      </footer>
    </div>
  )
}
