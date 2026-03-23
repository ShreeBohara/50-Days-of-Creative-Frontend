import { chapters } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

export function ChapterRail() {
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const setActiveChapter = useSolarStore((state) => state.setActiveChapter);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  return (
    <nav className="chapter-rail" aria-label="Chapters">
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          className={chapter.id === activeChapter ? "chapter-rail__dot is-active" : "chapter-rail__dot"}
          aria-label={chapter.id.replace("-", " ")}
          onClick={() => {
            setGuidedCameraActive(true);
            setActiveChapter(chapter.id);
          }}
        />
      ))}
    </nav>
  );
}
