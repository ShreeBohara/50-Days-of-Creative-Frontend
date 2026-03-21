import { chapters, planets } from "../data/solarData";

export function FallbackView() {
  return (
    <main className="fallback-view">
      <div className="fallback-view__hero">
        <p className="fallback-view__eyebrow">Day 03 / Cinematic Solar System</p>
        <h1>WebGL is unavailable, so this build falls back to an editorial orbital poster.</h1>
        <p>
          The premium 3D scene needs WebGL support. This fallback keeps the story, planet data,
          and visual direction intact instead of leaving a broken page.
        </p>
      </div>

      <section className="fallback-view__chapters" aria-label="Story chapters">
        {chapters.map((chapter) => (
          <article key={chapter.id} className="fallback-view__chapter">
            <p>{chapter.eyebrow}</p>
            <h2>{chapter.title}</h2>
            <p>{chapter.summary}</p>
          </article>
        ))}
      </section>

      <section className="fallback-view__planet-grid" aria-label="Planet overview">
        {planets.map((planet) => (
          <article key={planet.id} className="fallback-view__planet-card">
            <p>{planet.name}</p>
            <h3>{planet.subtitle}</h3>
            <span>{planet.distance}</span>
            <span>{planet.yearLength}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
