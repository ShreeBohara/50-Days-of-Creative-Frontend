import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

/**
 * Effects — Post-processing stack for the psychedelic tunnel.
 * Bloom makes bright shader regions glow, chromatic aberration adds
 * an analog-film quality, vignette focuses attention, and noise
 * adds subtle film grain.
 */
export default function Effects({ warpActive = false }) {
  /* During warp, crank up chromatic aberration */
  const aberrationOffset = warpActive
    ? new Vector2(0.008, 0.008)
    : new Vector2(0.0015, 0.0015)

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.8}
        luminanceThreshold={0.25}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={aberrationOffset}
        radialModulation={false}
        modulationOffset={0.5}
      />
      <Vignette
        offset={0.3}
        darkness={0.75}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.OVERLAY}
        opacity={0.06}
      />
    </EffectComposer>
  )
}
