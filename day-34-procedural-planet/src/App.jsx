import './App.css'

export default function App() {
  return (
    <main className="app-shell">
      <section className="scene-stage" aria-label="Procedural planet viewport">
        <div className="scene-placeholder">
          <span className="orbit-ring orbit-ring-a" aria-hidden="true" />
          <span className="orbit-ring orbit-ring-b" aria-hidden="true" />
          <div className="planet-core" aria-hidden="true" />
        </div>
      </section>

      <aside className="hud-panel" aria-label="Planet generator controls">
        <div className="hud-header">
          <p>Day 34</p>
          <h1>Procedural Planet</h1>
          <span>Shader terrain lab online</span>
        </div>
      </aside>
    </main>
  )
}
