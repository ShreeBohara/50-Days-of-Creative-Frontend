import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createBlobUniforms, vertexShader, fragmentShader } from './shaders.js'
import { debugBands } from '../debug.js'

// detail 64 => ~82k triangles: dense enough that per-vertex noise
// displacement reads as a smooth liquid surface, cheap enough for a
// vertex shader. The mobile perf tier lowers this later.
export default function Blob({ detail = 64 }) {
  const matRef = useRef(null)
  // Created once; the material holds this exact object, so per-frame
  // updates go through matRef (mutating render values is off-limits).
  const uniforms = useMemo(() => createBlobUniforms(), [])

  useFrame((state) => {
    const u = matRef.current?.uniforms
    if (!u) return
    u.u_time.value = state.clock.elapsedTime
    // audio wiring lands with the engine; until then the debug handle
    // (window.resonance.setBands) is the only band source
    if (debugBands.enabled) {
      u.u_bass.value = debugBands.bass
      u.u_mid.value = debugBands.mid
      u.u_high.value = debugBands.high
    }
  })

  return (
    <mesh>
      <icosahedronGeometry args={[1, detail]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}
