import Scene from './scene/Scene.jsx'
import './App.css'

export default function App() {
  return (
    <div className="stage">
      <Scene />
      <div className="vignette" />
      <header className="chrome chrome-top">
        <div>
          <h1 className="wordmark">RESONANCE</h1>
          <p className="tagline">a blob that hears</p>
        </div>
        <span className="day-badge">DAY 62 / 65</span>
      </header>
    </div>
  )
}
