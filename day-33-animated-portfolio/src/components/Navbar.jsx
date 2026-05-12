import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Navbar.css'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/work', label: 'Work' },
  { path: '/about', label: 'About' },
]

export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  /* detect scroll for background blur */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* close menu on route change */
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  /* close on Escape */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* lock body scroll when menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar-inner container">
          {/* logo */}
          <Link to="/" className="navbar-logo" aria-label="Home">
            <span className="navbar-logo-text">Portfolio</span>
          </Link>

          {/* desktop links */}
          <ul className="navbar-links">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path)
              return (
                <li key={link.path} className="navbar-link-item">
                  <Link
                    to={link.path}
                    className={`navbar-link ${isActive ? 'navbar-link--active' : ''}`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        className="navbar-underline"
                        layoutId="nav-underline"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* hamburger */}
          <button
            className={`navbar-burger ${menuOpen ? 'navbar-burger--open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="navbar-burger-line" />
            <span className="navbar-burger-line" />
          </button>
        </div>
      </nav>

      {/* mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2rem)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 2.5rem) 2rem)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2rem)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <ul className="mobile-menu-links">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.path}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={link.path}
                    className={`mobile-menu-link ${
                      location.pathname === link.path ? 'mobile-menu-link--active' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
