import { useEffect, useMemo, useState } from "react";
import type { QualityMode } from "../data/solarData";

function getWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function getInitialQuality(reducedMotion: boolean): QualityMode {
  if (reducedMotion) {
    return "balanced";
  }

  const memory = "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) : 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  if (memory >= 8 && cores >= 8 && pixelRatio <= 2) {
    return "high";
  }

  return "balanced";
}

export function useEnvironment() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const webglSupported = useMemo(() => getWebGLSupport(), []);
  const initialQuality = useMemo(() => getInitialQuality(reducedMotion), [reducedMotion]);

  return {
    reducedMotion,
    webglSupported,
    initialQuality,
  };
}
