import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { rt } from '../state/store.js'

// The 2048² spot shadow is re-rendered only on frames where something that
// casts it has moved (or appeared, or the silk is still alive). During the
// long still moments — the kept bowl, a paused mend, painting a seam — the
// whole shadow pass costs nothing.
class Gate {
  constructor() {
    this.last = NaN
    this.settle = 0
  }

  bind(gl) {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }

  frame(gl, scene) {
    scene.updateMatrixWorld()
    let sig = 0
    let n = 0
    scene.traverseVisible((o) => {
      if (!o.castShadow) return
      const e = o.matrixWorld.elements
      n++
      // a cheap order-sensitive fingerprint of every caster's pose
      sig += n * (e[0] + e[1] * 3 + e[2] * 5 + e[5] * 7 + e[9] * 11) + e[12] * 13 + e[13] * 17 + e[14] * 19
    })
    const veilAlive = rt.veil && !rt.veil.gone
    if (sig !== this.last || veilAlive) this.settle = 2 // and one more frame after it stops
    this.last = sig
    if (this.settle > 0) {
      this.settle--
      gl.shadowMap.needsUpdate = true
    }
  }
}

export default function ShadowGate() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const gate = useMemo(() => new Gate(), [])
  useEffect(() => gate.bind(gl), [gate, gl])
  // after every controller has posed its objects (they run at ≤ 0), before
  // the composer renders (priority 1)
  useFrame(() => gate.frame(gl, scene), 0.5)
  return null
}
