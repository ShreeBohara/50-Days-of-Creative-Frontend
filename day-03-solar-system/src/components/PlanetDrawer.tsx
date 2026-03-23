import { useEffect, useRef } from "react";
import gsap from "gsap";
import { planetsById } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function PlanetDrawer() {
  const drawerRef = useRef<HTMLElement | null>(null);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const overlayOpen = useSolarStore((state) => state.overlayOpen);
  const selectPlanet = useSolarStore((state) => state.selectPlanet);
  const setOverlayOpen = useSolarStore((state) => state.setOverlayOpen);

  const planet = selectedPlanet ? planetsById[selectedPlanet] : null;

  useEffect(() => {
    if (!drawerRef.current) return;
    gsap.to(drawerRef.current, {
      x: overlayOpen && planet ? 0 : 42,
      opacity: overlayOpen && planet ? 1 : 0,
      duration: 0.7,
      ease: "power3.out",
      pointerEvents: overlayOpen && planet ? "auto" : "none",
    });
  }, [overlayOpen, planet]);

  if (!planet) {
    return <aside ref={drawerRef} className="planet-drawer" aria-hidden="true" />;
  }

  return (
    <aside ref={drawerRef} className="planet-drawer" aria-hidden={!overlayOpen}>
      <button
        type="button"
        className="planet-drawer__close"
        onClick={() => {
          setOverlayOpen(false);
          selectPlanet(null);
        }}
        aria-label="Close"
      >
        ✕
      </button>

      <h2>{planet.name}</h2>

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
          <span>Moons</span>
          <strong>{planet.moons}</strong>
        </article>
      </div>
    </aside>
  );
}
