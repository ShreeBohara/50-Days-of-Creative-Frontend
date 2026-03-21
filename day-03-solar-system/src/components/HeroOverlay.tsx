import { useEffect, useRef } from "react";
import gsap from "gsap";
import { chaptersById, planetsById } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function HeroOverlay() {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const qualityMode = useSolarStore((state) => state.qualityMode);

  const chapter = chaptersById[activeChapter];
  const selected = selectedPlanet ? planetsById[selectedPlanet] : null;

  useEffect(() => {
    if (!overlayRef.current) {
      return;
    }

    gsap.fromTo(
      overlayRef.current.querySelectorAll("[data-hero-animate]"),
      {
        y: 18,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.06,
        ease: "power3.out",
      }
    );
  }, [activeChapter, selectedPlanet]);

  return (
    <section className="hero-overlay" ref={overlayRef}>
      <div className="hero-overlay__panel">
        <p className="hero-overlay__eyebrow" data-hero-animate>
          {selected ? `Planet Focus / ${selected.name}` : chapter.eyebrow}
        </p>
        <h1 data-hero-animate>{selected ? selected.subtitle : chapter.title}</h1>
        <p className="hero-overlay__lead" data-hero-animate>
          {selected ? selected.story : chapter.summary}
        </p>
        <p className="hero-overlay__body" data-hero-animate>
          {selected ? `${selected.distance} from the Sun · ${selected.yearLength} year · ${selected.moons}` : chapter.body}
        </p>
        <div className="hero-overlay__chips" data-hero-animate>
          <span>React Three Fiber</span>
          <span>GSAP Story Motion</span>
          <span>{qualityMode} quality</span>
        </div>
      </div>
    </section>
  );
}
