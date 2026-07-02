import './App.css'

export default function App() {
  return (
    <div className="studio">
      <header className="studio__header">
        <div className="studio__title">
          <span className="studio__day">Day 45 · Atelier</span>
          <h1 className="studio__wordmark">VITRAIL</h1>
          <p className="studio__tagline">Procedural stained glass, grown from a seed</p>
        </div>
      </header>

      <main className="studio__body">
        <section className="stage-col" aria-label="Window stage">
          <div className="stage-arch" role="img" aria-label="Empty window frame awaiting glass">
            <span className="stage-arch__hint">The glass is being mixed…</span>
          </div>
        </section>
      </main>

      <footer className="studio__foot">
        <span>VITRAIL</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
