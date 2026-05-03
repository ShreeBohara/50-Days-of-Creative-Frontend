import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import TunnelScene from './components/TunnelScene'
import HUD from './components/HUD'
import './App.css'

/**
 * App — Root component for the Infinite Psychedelic Tunnel.
 * Sets up the R3F Canvas and HUD overlay.
 */
export default function App() {
  const [speed, setSpeed] = useState(0.5) // Normalized 0 to 1
  const [warpActive, setWarpActive] = useState(false)

  return (
    <div id="app-container">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0] }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#000' }}
      >
        <TunnelScene speed={speed} warpActive={warpActive} />
      </Canvas>
      <HUD 
        speed={speed} 
        setSpeed={setSpeed} 
        warpActive={warpActive} 
        setWarpActive={setWarpActive} 
      />
    </div>
  )
}
