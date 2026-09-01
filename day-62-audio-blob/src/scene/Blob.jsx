import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createBlobUniforms, vertexShader, fragmentShader } from './shaders.js'
import { sampleLevels } from '../audio/engine.js'

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
    const t = state.clock.elapsedTime
    u.u_time.value = t
    // single sampler per frame: the blob pulls the envelope-smoothed
    // bands; everything else (spectrum strip, bloom) reads engine.levels
    const levels = sampleLevels(t)
    u.u_bass.value = levels.bass
    u.u_mid.value = levels.mid
    u.u_high.value = levels.high
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
