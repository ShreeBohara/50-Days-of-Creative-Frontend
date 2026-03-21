import { planets } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function QuickJump() {
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const selectPlanet = useSolarStore((state) => state.selectPlanet);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  return (
    <nav className="quick-jump" aria-label="Planet quick jump">
      {planets.map((planet) => (
        <button
          key={planet.id}
          type="button"
          className={selectedPlanet === planet.id ? "quick-jump__item is-active" : "quick-jump__item"}
          onClick={() => {
            setGuidedCameraActive(true);
            selectPlanet(planet.id);
            document.getElementById(`chapter-${planet.chapter}`)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        >
          {planet.name}
        </button>
      ))}
    </nav>
  );
}
