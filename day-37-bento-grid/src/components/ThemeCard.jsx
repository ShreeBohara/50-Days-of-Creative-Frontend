import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import BentoCard from './BentoCard'
import { useTheme } from '../hooks/useTheme'

function ThemeCard() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <BentoCard
      as="button"
      type="button"
      area="theme"
      className="theme-card"
      label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      aria-pressed={isLight}
      onClick={toggleTheme}
    >
      <div className="theme-heading">
        <span className="eyebrow">Atmosphere</span>
        <strong>{isLight ? 'Light' : 'Dark'}</strong>
      </div>
      <div className="theme-orbit" aria-hidden="true">
        <motion.div
          className="theme-sun"
          animate={{ rotate: isLight ? 0 : -75, scale: isLight ? 1 : 0.72, x: isLight ? 0 : -18 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        >
          <Sun size={48} />
        </motion.div>
        <motion.div
          className="theme-moon"
          animate={{ rotate: isLight ? 80 : 0, scale: isLight ? 0.68 : 1, x: isLight ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        >
          <Moon size={42} />
        </motion.div>
      </div>
      <span className="theme-hint">Tap to shift the light</span>
    </BentoCard>
  )
}

export default ThemeCard
