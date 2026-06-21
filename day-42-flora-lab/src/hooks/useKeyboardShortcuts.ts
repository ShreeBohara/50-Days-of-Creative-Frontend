import { useEffect } from 'react'
import { useFloraStore } from '../store/useFloraStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) useFloraStore.getState().redo()
        else useFloraStore.getState().undo()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (key === 'r') useFloraStore.getState().randomize()
      if (key === 'm') useFloraStore.getState().mutate()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
