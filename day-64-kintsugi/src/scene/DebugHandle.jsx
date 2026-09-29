import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { rt, store } from '../state/store.js'

// ?debug=1 only: expose the scene for scripted QA (window.__d64) and a pump to
// advance frames while the preview tab is hidden and rAF is throttled.
export default function DebugHandle() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    window.__d64 = {
      get three() {
        return get()
      },
      rt,
      store,
      pump(n = 1, dt = 1 / 60) {
        const s = get()
        for (let i = 0; i < n; i++) s.advance(performance.now() / 1000 + i * dt, true)
      },
    }
    return () => {
      delete window.__d64
    }
  }, [get])
  return null
}
