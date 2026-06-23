import { useEffect } from 'react'
import { decodeParams } from '../domain/serialize'
import { useStudioStore } from '../store/useStudioStore'
import { readShareToken } from '../utils/share'

/** On first load, restore a figure encoded in the URL hash (#fig=…). */
export function useHashFigure(): void {
  useEffect(() => {
    const token = readShareToken(window.location.hash)
    if (!token) return
    const params = decodeParams(token)
    if (params) useStudioStore.getState().loadParams(params)
  }, [])
}
