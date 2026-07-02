import { useEffect } from 'react'
import { useStudioStore } from '../store/useStudioStore'

// Space → new seed · R → randomize · M → mutate. Nothing fires while the
// user is typing in a field.
export function useKeyboardShortcuts(): void {
  const reseed = useStudioStore((s) => s.reseed)
  const randomize = useStudioStore((s) => s.randomize)
  const mutateCurrent = useStudioStore((s) => s.mutateCurrent)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, textarea, select, button, [contenteditable]')) return

      if (e.code === 'Space') {
        e.preventDefault()
        reseed()
      } else if (e.key === 'r' || e.key === 'R') {
        randomize()
      } else if (e.key === 'm' || e.key === 'M') {
        mutateCurrent()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reseed, randomize, mutateCurrent])
}
