import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Home.css'

/* ---------- floating shapes ---------- */
const shapes = [
  { type: 'circle', size: 120, x: '10%', y: '20%', delay: 0 },
  { type: 'square', size: 80, x: '80%', y: '15%', delay: 0.5 },
  { type: 'circle', size: 60, x: '70%', y: '60%', delay: 1 },
  { type: 'square', size: 100, x: '15%', y: '70%', delay: 1.5 },
  { type: 'circle', size: 40, x: '50%', y: '80%', delay: 0.8 },
  { type: 'square', size: 50, x: '90%', y: '45%', delay: 1.2 },
]

/* ---------- typewriter hook ---------- */
function useTypewriter(text, speed = 50, startDelay = 1500) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    let timeout

    const start = setTimeout(() => {
      const type = () => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
          timeout = setTimeout(type, speed)
        } else {
          setDone(true)
        }
      }
      type()
    }, startDelay)

    return () => {
      clearTimeout(start)
      clearTimeout(timeout)
    }
  }, [text, speed, startDelay])

  return { displayed, done }
}

/* ---------- component ---------- */
export default function Home() {
  const tagline = 'Building interfaces that feel alive — with motion, depth, and soul.'
  const { displayed, done } = useTypewriter(tagline, 35, 1400)

  const nameChars = 'Creative Developer'.split('')

  return (
    <div className="page home-page">
      {/* floating shapes */}
      <div className="home-shapes" aria-hidden="true">
        {shapes.map((s, i) => (
          <motion.div
            key={i}
            className={`home-shape home-shape--${s.type}`}
            style={{
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
            }}
            animate={{
              y: [0, -20, 0, 15, 0],
              rotate: [0, s.type === 'square' ? 45 : 0, 0, s.type === 'square' ? -20 : 0, 0],
              scale: [1, 1.05, 1, 0.95, 1],
            }}
            transition={{
              duration: 8 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.delay,
            }}
          />
        ))}
      </div>

      <div className="home-content container">
        {/* label */}
        <motion.span
          className="home-label text-label"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Portfolio 2025
        </motion.span>

        {/* name reveal with clip-path wipe */}
        <h1 className="home-title text-display">
          {nameChars.map((char, i) => (
            <motion.span
              key={i}
              className="home-char"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{
                duration: 0.6,
                delay: 0.4 + i * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>

        {/* typewriter tagline */}
        <p className="home-tagline text-body">
          {displayed}
          <span className={`home-cursor ${done ? 'home-cursor--blink' : ''}`}>|</span>
        </p>

        {/* CTA */}
        <motion.div
          className="home-cta"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.8 }}
        >
          <Link to="/work" className="home-cta-btn">
            <span>View Work</span>
            <svg
              className="home-cta-arrow"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <Link to="/about" className="home-about-link">
            About Me
          </Link>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          className="home-scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
        >
          <div className="home-scroll-dot" />
          <span className="text-small">Scroll to explore</span>
        </motion.div>
      </div>
    </div>
  )
}
