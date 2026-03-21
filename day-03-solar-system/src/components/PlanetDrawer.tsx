import { useEffect, useRef } from "react";
import gsap from "gsap";
import { chaptersById, planetsById } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function PlanetDrawer() {
  const drawerRef = useRef<HTMLElement | null>(null);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const overlayOpen = useSolarStore((state) => state.overlayOpen);
  const selectPlanet = useSolarStore((state) => state.selectPlanet);
  const setOverlayOpen = useSolarStore((state) => state.setOverlayOpen);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  const planet = selectedPlanet ? planetsById[selectedPlanet] : null;

  useEffect(() => {
    if (!drawerRef.current) {
      return;
    }

    gsap.to(drawerRef.current, {
      x: overlayOpen && planet ? 0 : 42,
      opacity: overlayOpen && planet ? 1 : 0,
      duration: 0.7,
      ease: "power3.out",
      pointerEvents: overlayOpen && planet ? "auto" : "none",
    });
  }, [overlayOpen, planet]);

  if (!planet) {
    return <aside ref={drawerRef} className="planet-drawer" aria-hidden="true"></aside>;
  }

  const chapter = chaptersById[planet.chapter];

  return (
    <aside ref={drawerRef} className="planet-drawer" aria-hidden={!overlayOpen}>
      <div className="planet-drawer__glow" aria-hidden="true"></div>
      <button
        type="button"
        className="planet-drawer__close"
        onClick={() => {
          setOverlayOpen(false);
          selectPlanet(null);
        }}
      >
        Close
      </button>

      <p className="planet-drawer__eyebrow">{chapter.eyebrow}</p>
      <h2>{planet.name}</h2>
      <p className="planet-drawer__subtitle">{planet.subtitle}</p>

      <div className="planet-drawer__stats">
        <article>
          <span>Diameter</span>
          <strong>{planet.diameter}</strong>
        </article>
        <article>
          <span>Distance</span>
          <strong>{planet.distance}</strong>
        </article>
        <article>
          <span>Orbital track</span>
          <strong>{planet.orbitLabel}</strong>
        </article>
        <article>
          <span>Moons</span>
          <strong>{planet.moons}</strong>
        </article>
      </div>

      <p className="planet-drawer__copy">{planet.story}</p>

      <div className="planet-drawer__details">
        <span>Day length: {planet.dayLength}</span>
        <span>Year length: {planet.yearLength}</span>
      </div>

      <button
        type="button"
        className="planet-drawer__jump"
        onClick={() => {
          setGuidedCameraActive(true);
          document.getElementById(`chapter-${planet.chapter}`)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      >
        Jump to {chapter.title.split(" ")[0]} chapter
      </button>
    </aside>
  );
}
