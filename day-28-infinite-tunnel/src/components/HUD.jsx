import { useState, useEffect } from 'react'

/**
 * HUD — Glassmorphism overlay for controls.
 * @param {object} props
 * @param {number} props.speed - Current speed (0 to 1)
 * @param {function} props.setSpeed - Update base speed
 * @param {boolean} props.warpActive - Is warp burst active?
 * @param {function} props.setWarpActive - Trigger warp burst
 */
export default function HUD({ speed, setSpeed, warpActive, setWarpActive }) {
  const [showSplash, setShowSplash] = useState(true)

  /* Dismiss splash on any interaction */
  useEffect(() => {
    const dismiss = () => setShowSplash(false)
    window.addEventListener('mousemove', dismiss, { once: true })
    window.addEventListener('touchstart', dismiss, { once: true })
    window.addEventListener('keydown', dismiss, { once: true })
    return () => {
      window.removeEventListener('mousemove', dismiss)
      window.removeEventListener('touchstart', dismiss)
      window.removeEventListener('keydown', dismiss)
    }
  }, [])

  /* Scroll to change speed */
  useEffect(() => {
    const handleWheel = (e) => {
      setSpeed((prev) => {
        const next = prev - e.deltaY * 0.0005
        return Math.max(0, Math.min(1, next)) // clamp 0 to 1
      })
    }
    window.addEventListener('wheel', handleWheel)
    return () => window.removeEventListener('wheel', handleWheel)
  }, [setSpeed])

  const handleWarp = () => {
    if (warpActive) return
    setWarpActive(true)
    setTimeout(() => setWarpActive(false), 2000)
  }

  return (
    <div className="hud-overlay">
      {/* Splash Screen */}
      <div className={`splash ${showSplash ? 'visible' : 'hidden'}`}>
        <h1>Infinite Tunnel</h1>
        <p>Move mouse to steer • Scroll to change speed</p>
      </div>

      {/* Controls panel */}
      <div className="controls-panel">
        <div className="speed-control">
          <label htmlFor="speed-slider">Speed</label>
          <input
            id="speed-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="slider"
          />
        </div>

        <button 
          className={`btn-warp ${warpActive ? 'active' : ''}`}
          onClick={handleWarp}
        >
          {warpActive ? 'WARP ENGAGED' : 'WARP'}
        </button>
      </div>
    </div>
  )
}
