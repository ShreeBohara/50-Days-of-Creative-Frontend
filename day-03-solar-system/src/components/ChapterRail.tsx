import { chapters } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function ChapterRail() {
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  return (
    <nav className="chapter-rail" aria-label="Story chapters">
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          className={chapter.id === activeChapter ? "chapter-rail__item is-active" : "chapter-rail__item"}
          onClick={() => {
            setGuidedCameraActive(true);
            document.getElementById(`chapter-${chapter.id}`)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        >
          <span className="chapter-rail__dot"></span>
          <span className="chapter-rail__label">{chapter.id.replace("-", " ")}</span>
        </button>
      ))}
    </nav>
  );
}
