import './App.css'

function Masthead() {
  return (
    <header className="masthead">
      <div className="wordmark" aria-label="TYPEFORGE">
        <span>TYPE</span>
        <span className="wordmark-mark" aria-hidden="true" />
        <span>FORGE</span>
      </div>
      <p className="masthead-sub">Kinetic Type Studio</p>
      <div className="masthead-meta">
        <span className="status">
          <span className="status-dot" aria-hidden="true" />
          LIVE
        </span>
        <span className="masthead-no">No.41</span>
      </div>
    </header>
  )
}

function Hud() {
  return (
    <footer className="hud" aria-hidden="true">
      <span className="hud-cell">
        <i>font</i> Fraunces Variable
      </span>
      <span className="hud-cell">
        <i>axes</i> wght · opsz · SOFT · WONK
      </span>
      <span className="hud-cell">
        <i>pointer</i> ——.— / ——.—
      </span>
      <span className="hud-cell">
        <i>behavior</i> magnet
      </span>
      <span className="hud-cell hud-sig">
        50 Days of Creative Frontend
      </span>
    </footer>
  )
}

export default function App() {
  return (
    <div className="studio">
      <Masthead />
      <main className="stage-frame">
        <div className="crop crop-tl" aria-hidden="true" />
        <div className="crop crop-tr" aria-hidden="true" />
        <div className="crop crop-bl" aria-hidden="true" />
        <div className="crop crop-br" aria-hidden="true" />
        <p className="stage-placeholder">STAGE</p>
      </main>
      <Hud />
    </div>
  )
}
