import { useSyncExternalStore } from 'react'

let motionQuery: MediaQueryList | null = null

function getMotionQuery() {
  if (typeof window === 'undefined') return null
  motionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)')
  return motionQuery
}

function subscribe(callback: () => void) {
  const query = getMotionQuery()
  query?.addEventListener('change', callback)
  return () => query?.removeEventListener('change', callback)
}

function getSnapshot() {
  return getMotionQuery()?.matches ?? false
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
