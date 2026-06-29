import { useEffect } from 'react'
import { useStudioStore } from '../store/useStudioStore'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/**
 * Global keyboard shortcuts:
 *   Space — new seed   R — randomize   M — mutate   S — save
 *   ⌘/Ctrl+Z — undo    ⇧⌘/Ctrl+Z or ⌘/Ctrl+Y — redo
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const store = useStudioStore.getState()
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        store.redo()
        return
      }
      if (mod) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          store.reseed()
          break
        case 'r':
        case 'R':
          store.randomize()
          break
        case 'm':
        case 'M':
          store.mutateCurrent()
          break
        case 's':
        case 'S':
          store.saveCurrent()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
