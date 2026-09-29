import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { dispatch, rt, store } from '../state/store.js'

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
      // drop the intact bowl from height h (m), optionally tilted/thrown
      drop(h = 0.3, { vx = 0, vy = 0, vz = 0, tilt = 0.5, yaw = 0 } = {}) {
        const b = rt.bowl?.body
        if (!b || store.get().phase !== 'intact') return 'not intact'
        dispatch({ type: 'LIFT' })
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0.2, 'YXZ'))
        b.setTranslation({ x: -0.012, y: h, z: -0.004 }, true)
        b.setRotation(q, true)
        b.setLinvel({ x: vx, y: vy, z: vz }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
        rt.releaseSpeed = Math.hypot(vx, vy, vz)
        dispatch({ type: 'SET_DOWN' })
        return 'dropped'
      },
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
