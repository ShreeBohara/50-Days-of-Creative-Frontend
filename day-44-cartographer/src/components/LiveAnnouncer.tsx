import { useEffect, useRef, useState } from 'react'
import { worldName } from '../domain/names'
import { useStudioStore } from '../store/useStudioStore'

// Polite, screen-reader-only announcements for world changes.
export default function LiveAnnouncer() {
  const drawKey = useStudioStore((s) => s.drawKey)
  const count = useStudioStore((s) => s.collection.length)
  const [message, setMessage] = useState('')
  const prevCount = useRef(count)
  const ticks = useRef(0)

  useEffect(() => {
    if (drawKey === 0) return
    ticks.current += 1
    const title = worldName(useStudioStore.getState().params)
    // trailing space toggles so repeated identical actions re-announce
    setMessage(`Charted ${title}${ticks.current % 2 ? '' : ' '}`)
  }, [drawKey])

  useEffect(() => {
    if (count > prevCount.current) setMessage('World saved to your collection')
    prevCount.current = count
  }, [count])

  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
