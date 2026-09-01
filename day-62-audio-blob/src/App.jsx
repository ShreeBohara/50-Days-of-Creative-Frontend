import { useEffect, useState } from 'react'
import Scene from './scene/Scene.jsx'
import { enterSynthMode, enterFileMode } from './audio/inputs.js'
import './App.css'

const dragHasFiles = (e) => e.dataTransfer?.types?.includes('Files')

export default function App() {
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)

  const begin = () => {
    // must happen inside the click: browsers gate AudioContext on a gesture
    enterSynthMode()
    setRunning(true)
  }

  // whole-viewport drop target: drag an mp3 anywhere to feed the blob
  useEffect(() => {
    let depth = 0
    const enter = (e) => {
      if (!dragHasFiles(e)) return
      e.preventDefault()
      depth += 1
      setDragging(true)
    }
    const over = (e) => {
      if (dragHasFiles(e)) e.preventDefault()
    }
    const leave = (e) => {
      if (!dragHasFiles(e)) return
      depth -= 1
      if (depth <= 0) setDragging(false)
    }
    const drop = (e) => {
      if (!dragHasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        enterFileMode(file).then((ok) => {
          if (ok) setRunning(true)
        })
      }
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

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
      {dragging && (
        <div className="dropzone">
          <p className="dropzone-title">drop the track</p>
          <p className="dropzone-hint">mp3 · wav · ogg · m4a — it loops</p>
        </div>
      )}
    </div>
  )
}
