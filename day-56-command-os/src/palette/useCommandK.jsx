import { useCallback, useEffect, useState } from 'react'

/**
 * Owns the palette's open state and the global ⌘K / Ctrl+K toggle.
 * ESC-to-close is handled inside the palette (so it only fires while open and
 * can first pop a nested page).
 */
export function useCommandK() {
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return {
    isOpen,
    open: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
  }
}
