import { useEffect } from 'react'
import { useFloraStore } from '../store/useFloraStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return

      event.preventDefault()
      if (event.shiftKey) useFloraStore.getState().redo()
      else useFloraStore.getState().undo()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
