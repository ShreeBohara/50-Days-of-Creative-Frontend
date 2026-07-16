import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { capReactionParticles, createReactionParticles } from '../lib/reactionParticles.js'
import './ReactionBurstExhibit.css'

function HeartGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.2 4.4 13A5.1 5.1 0 0 1 11.6 5.8l.4.5.4-.5A5.1 5.1 0 0 1 19.6 13Z" />
    </svg>
  )
}

function SparkGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.8c.5 6.4 3.8 9.7 10.2 10.2-6.4.5-9.7 3.8-10.2 10.2C11.5 15.8 8.2 12.5 1.8 12 8.2 11.5 11.5 8.2 12 1.8Z" />
    </svg>
  )
}

function ReactionParticle({ particle, reducedMotion }) {
  const travel = reducedMotion
    ? { x: 0, y: [0, -10, 0], rotate: 0 }
    : { x: particle.x, y: [0, particle.lift, particle.fall], rotate: particle.rotation }

  return (
    <motion.span
      className={`reaction-particle reaction-particle--${particle.color}`}
      data-testid="reaction-particle"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        ...travel,
        opacity: [0, 1, 0.92, 0],
        scale: [0, particle.scale, particle.scale * 0.86],
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reducedMotion ? 0.24 : particle.duration,
        delay: reducedMotion ? 0 : particle.delay,
        times: [0, 0.18, 0.68, 1],
        ease: 'easeOut',
      }}
      aria-hidden="true"
    >
      {particle.kind === 'heart' ? <HeartGlyph /> : <SparkGlyph />}
    </motion.span>
  )
}

export function ReactionBurstExhibit() {
  const [particles, setParticles] = useState([])
  const [reactionCount, setReactionCount] = useState(0)
  const burstRef = useRef(0)
  const cleanupTimersRef = useRef(new Set())
  const buttonControls = useAnimationControls()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const timers = cleanupTimersRef.current
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [])

  const sendReaction = () => {
    burstRef.current += 1
    const burstId = burstRef.current
    const generated = createReactionParticles(5700 + burstId).map((particle) => ({
      ...particle,
      id: `${burstId}-${particle.index}`,
    }))
    const generatedIds = new Set(generated.map(({ id }) => id))

    setParticles((current) => capReactionParticles(current, generated))
    setReactionCount((count) => count + 1)
    buttonControls.start(reducedMotion
      ? { opacity: [0.76, 1], transition: { duration: 0.18 } }
      : { scaleX: [1, 0.84, 1.08, 1], scaleY: [1, 1.14, 0.94, 1], transition: { duration: 0.38 } })

    const longestLife = Math.max(...generated.map(({ duration, delay }) => duration + delay))
    const timer = setTimeout(() => {
      setParticles((current) => current.filter(({ id }) => !generatedIds.has(id)))
      cleanupTimersRef.current.delete(timer)
    }, (reducedMotion ? 300 : longestLife * 1000 + 80))
    cleanupTimersRef.current.add(timer)
  }

  return (
    <div className="reaction-burst">
      <div className="reaction-burst__field" aria-hidden="true">
        <AnimatePresence>
          {particles.map((particle) => (
            <ReactionParticle key={particle.id} particle={particle} reducedMotion={reducedMotion} />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        className="reaction-burst__button"
        type="button"
        animate={buttonControls}
        whileTap={reducedMotion ? undefined : { scale: 0.94 }}
        onClick={sendReaction}
        aria-label="Send a heart reaction"
      >
        <span className="reaction-burst__icon"><HeartGlyph /></span>
        <span className="reaction-burst__copy">
          <strong>Appreciate</strong>
          <small>Send a little signal</small>
        </span>
        <motion.span
          className="reaction-burst__count"
          key={reactionCount}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          aria-hidden="true"
        >
          {reactionCount || '—'}
        </motion.span>
      </motion.button>

      <span className="sr-only" aria-live="polite">
        {reactionCount ? `Reaction sent. ${reactionCount} total.` : ''}
      </span>
    </div>
  )
}
