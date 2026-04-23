/**
 * Loader.jsx — Animated loading screen with progress bar
 * Uses Drei's useProgress to track R3F asset loading.
 */
import { useState, useEffect } from 'react'
import { useProgress } from '@react-three/drei'
import './Loader.css'

export default function Loader() {
  const { progress, active } = useProgress()
  const [fadeOut, setFadeOut] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!active && progress >= 100) {
      // Start fade-out after a small delay
      const timer = setTimeout(() => setFadeOut(true), 400)
      // Remove from DOM after fade transition
      const removeTimer = setTimeout(() => setVisible(false), 1000)
      return () => {
        clearTimeout(timer)
        clearTimeout(removeTimer)
      }
    }
  }, [active, progress])

  if (!visible) return null

  return (
    <div className={`loader-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loader-icon">👟</div>
      <div className="loader-progress-track">
        <div
          className="loader-progress-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="loader-text">Loading your studio…</div>
    </div>
  )
}
