import { useEffect } from 'react'
import { useStudioStore } from '../store/useStudioStore'
import { parseShareHash } from '../utils/share'

// Resolve a share link once on load: #w=… becomes the live window.
export function useHashFigure(): void {
  const loadGenome = useStudioStore((s) => s.loadGenome)

  useEffect(() => {
    const genome = parseShareHash(location.hash)
    if (genome) loadGenome(genome)
  }, [loadGenome])
}
