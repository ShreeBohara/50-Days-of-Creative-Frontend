import { useSolarStore } from "../store/solarStore";

export function QualityBadge() {
  const qualityMode = useSolarStore((state) => state.qualityMode);
  const reducedMotion = useSolarStore((state) => state.reducedMotion);

  return (
    <div className="quality-badge" aria-live="polite">
      <span>{qualityMode} render</span>
      <span>{reducedMotion ? "reduced motion" : "cinematic motion"}</span>
    </div>
  );
}
