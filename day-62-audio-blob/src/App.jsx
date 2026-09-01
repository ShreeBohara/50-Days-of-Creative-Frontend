import { useState } from 'react'
import Scene from './scene/Scene.jsx'
import { startSynth } from './audio/synth.js'
import './App.css'

export default function App() {
  const [running, setRunning] = useState(false)

  const begin = () => {
    // must happen inside the click: browsers gate AudioContext on a gesture
    startSynth()
    setRunning(true)
  }

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
      {!running && (
        <button className="start-overlay" onClick={begin}>
          <span className="start-ring">▶</span>
          <span className="start-label">press play — the blob is listening</span>
        </button>
      )}
    </div>
  )
}
