import { useEffect, useRef } from "react";
import gsap from "gsap";
import { chaptersById, planetsById } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function HeroOverlay() {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);

  const chapter = chaptersById[activeChapter];
  const selected = selectedPlanet ? planetsById[selectedPlanet] : null;

  useEffect(() => {
    if (!labelRef.current) return;
    gsap.fromTo(
      labelRef.current,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    );
  }, [activeChapter, selectedPlanet]);

  return (
    <div
      ref={labelRef}
      className={selected ? "hero-label hero-label--planet" : "hero-label"}
    >
      {selected ? selected.name : chapter.title}
    </div>
  );
}
