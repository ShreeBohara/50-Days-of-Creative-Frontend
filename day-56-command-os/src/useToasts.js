import { useCallback, useState } from 'react'

let seq = 0

/**
 * Minimal toast queue. Toasts auto-dismiss after ~2.6s (a `leaving` flag plays
 * the exit animation first). State updates happen in callbacks, never in an
 * effect body.
 */
export function useToasts() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 200)
  }, [])

  const pushToast = useCallback(
    (message, icon = 'check') => {
      const id = (seq += 1)
      setToasts((list) => [...list, { id, message, icon, leaving: false }])
      window.setTimeout(() => dismiss(id), 2600)
    },
    [dismiss],
  )

  return { toasts, pushToast, dismiss }
}
