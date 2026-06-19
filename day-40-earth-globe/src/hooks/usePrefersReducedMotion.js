import { useEffect, useState } from 'react'

export default function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(motionQuery.matches)

    updatePreference()
    motionQuery.addEventListener('change', updatePreference)

    return () => motionQuery.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}
