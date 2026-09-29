import { Bloom, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

// ?fx=ao,nobloom,nograin,nosmaa,nocomp — QA switches for isolating a pass
const FX = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fx') || '' : ''

// Museum-ceramics finish on a frame budget. Screen-space AO was ~60% of the
// whole frame at retina sizes, so grounding now comes from the key light's
// shadow and a soft contact shadow under the bowl (Grounding.jsx); bloom runs
// at half resolution and only catches burnished gold and glaze highlights.
export default function Effects() {
  if (FX.includes('nocomp')) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {FX.includes('ao') ? <N8AO halfRes quality="performance" aoRadius={0.04} intensity={1.1} color="#120b07" /> : <></>}
      {FX.includes('nobloom') ? (
        <></>
      ) : (
        <Bloom mipmapBlur levels={5} resolutionScale={0.5} luminanceThreshold={0.92} luminanceSmoothing={0.08} intensity={0.35} />
      )}
      <Vignette offset={0.28} darkness={0.62} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      {/* SMAA looks for edges in the tone-mapped image (on HDR input it cut
          dark notches into the bloom around burnished gold); grain goes last */}
      {FX.includes('nosmaa') ? <></> : <SMAA />}
      {FX.includes('nograin') ? <></> : <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.05} />}
    </EffectComposer>
  )
}
