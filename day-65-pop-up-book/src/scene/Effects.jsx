// Post: a gentle tilt-shift (the miniature, macro-lens look that makes paper
// dioramas read as small, real objects), SMAA, a soft vignette, and the
// Khronos neutral tone map so riso inks keep their colour.

import { EffectComposer, SMAA, TiltShift2, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export default function Effects({ tier }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {tier !== 'C' ? <TiltShift2 blur={0.09} taper={0.6} start={[0.5, 0.0]} end={[0.5, 1.0]} samples={8} /> : null}
      <Vignette offset={0.32} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  )
}
