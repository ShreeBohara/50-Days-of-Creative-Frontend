import { useState, useEffect } from 'react'

/**
 * HUD — Glassmorphism overlay for controls.
 * @param {object} props
 * @param {number} props.speed - Current speed (0 to 1)
 * @param {function} props.setSpeed - Update base speed
 * @param {boolean} props.warpActive - Is warp burst active?
 * @param {function} props.setWarpActive - Trigger warp burst
 * @param {boolean} props.audioActive - Is audio playing?
 * @param {function} props.setAudioActive - Toggle audio
 */
export default function HUD({ speed, setSpeed, warpActive, setWarpActive, audioActive, setAudioActive }) {
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

        <div className="audio-control">
          <button 
            className={`btn-audio ${audioActive ? 'active' : ''}`}
            onClick={() => setAudioActive(!audioActive)}
            title="Toggle Ambient Audio"
          >
            {audioActive ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>
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
