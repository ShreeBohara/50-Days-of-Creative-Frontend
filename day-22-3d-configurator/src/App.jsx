/**
 * Day 22 — 3D Product Configurator
 * Main application shell with Scene + SneakerModel
 */
import Scene from './components/Scene'
import SneakerModel from './components/SneakerModel'

export default function App() {
  return (
    <div className="app-shell" style={{ width: '100vw', height: '100vh', background: 'var(--bg-dark)' }}>
      <Scene>
        <SneakerModel />
      </Scene>
    </div>
  )
}
