import { Bloom, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

// ?fx=noao,nograin,nobloom — QA switches for isolating a pass
const FX = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fx') || '' : ''

// Museum-ceramics finish: soft AO in the tray, a restrained bloom that only
// catches burnished gold and glaze highlights, film grain, vignette, AgX.
export default function Effects({ tier = 'A' }) {
  const ao = tier === 'A' && !FX.includes('noao')
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {ao ? (
        <N8AO halfRes quality="medium" aoRadius={0.04} distanceFalloff={0.5} intensity={1.1} denoiseRadius={10} color="#120b07" />
      ) : (
        <></>
      )}
      {FX.includes('nobloom') ? <></> : <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.08} intensity={0.35} />}
      <SMAA />
      <Vignette offset={0.28} darkness={0.62} />
      {FX.includes('nograin') ? <></> : <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.05} />}
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  )
}
