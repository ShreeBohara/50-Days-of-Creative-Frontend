import { useEffect, useRef, useState } from 'react'
import { windowTitle } from '../domain/compose'
import { getPalette } from '../domain/palettes'
import { useStudioStore } from '../store/useStudioStore'

// Politely narrates window swaps for screen-reader users. Slider scrubbing
// coalesces through the debounce; the initial render stays silent.
export default function LiveAnnouncer() {
  const genome = useStudioStore((s) => s.genome)
  const [message, setMessage] = useState('')
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = window.setTimeout(() => {
      setMessage(
        `Now showing ${windowTitle(genome)} — a ${genome.archetype} window in ${getPalette(genome.paletteId).name} glass, seed ${genome.seed}.`,
      )
    }, 400)
    return () => window.clearTimeout(timer)
  }, [genome])

  return (
    <div className="sr-only" role="status" aria-live="polite">
      {message}
    </div>
  )
}
