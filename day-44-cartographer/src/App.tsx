import './App.css'

// Scaffold shell. The plotting stage, control rail, collection, blend lab and
// export toolbar are wired in over the following commits.
export default function App() {
  return (
    <div className="studio">
      <header className="studio__head">
        <div className="studio__brand">
          <span className="eyebrow">50 Days of Creative Frontend · Day 44</span>
          <h1 className="studio__title">MERIDIAN</h1>
          <p className="studio__tag">Procedural Cartographer</p>
        </div>
      </header>

      <main className="studio__body">
        <section className="stage-col" aria-label="Chart stage">
          <div className="chart-frame">
            <div className="chart-frame__plate">
              <p className="chart-frame__placeholder">Charting imaginary worlds…</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="studio__foot">
        <span>MERIDIAN</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
