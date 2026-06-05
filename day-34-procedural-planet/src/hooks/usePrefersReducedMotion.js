import { useEffect, useState } from 'react'

export default function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => setPrefersReducedMotion(motionQuery.matches)

    syncMotionPreference()
    motionQuery.addEventListener('change', syncMotionPreference)

    return () => motionQuery.removeEventListener('change', syncMotionPreference)
  }, [])

  return prefersReducedMotion
}
