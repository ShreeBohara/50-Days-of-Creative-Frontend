import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { engine } from '../audio/engine.js'

// Post chain: one mipmap bloom whose intensity rides overall loudness.
// Quiet passages barely glow; a drop turns the rim into a lamp.
export default function Effects({ multisampling = 4 }) {
  const bloomRef = useRef(null)

  useFrame(() => {
    const bloom = bloomRef.current
    if (!bloom) return
    bloom.intensity = 0.3 + engine.levels.loud * 1.5
  })

  return (
    <EffectComposer multisampling={multisampling}>
      <Bloom
        ref={bloomRef}
        mipmapBlur
        intensity={0.35}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.25}
        radius={0.75}
      />
    </EffectComposer>
  )
}
