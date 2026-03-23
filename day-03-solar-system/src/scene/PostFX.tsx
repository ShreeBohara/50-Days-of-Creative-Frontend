import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useSolarStore } from "../store/solarStore";

export function PostFX() {
  const qualityMode = useSolarStore((state) => state.qualityMode);
  const reducedMotion = useSolarStore((state) => state.reducedMotion);

  if (qualityMode === "fallback") {
    return null;
  }

  return (
    <EffectComposer multisampling={qualityMode === "high" ? 8 : 0}>
      <Bloom
        intensity={qualityMode === "high" ? 1.5 : 0.9}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.34}
        mipmapBlur
      />
      <ChromaticAberration
        offset={qualityMode === "high" ? new Vector2(0.00054, 0.00042) : new Vector2(0.00027, 0.00021)}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={reducedMotion ? 0.01 : 0.025} premultiply />
      <Vignette eskil={false} offset={0.22} darkness={0.8} />
    </EffectComposer>
  );
}
