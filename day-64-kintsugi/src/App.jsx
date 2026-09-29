import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect } from 'react'
import Stage from './scene/Stage.jsx'
import Overlay from './ui/Overlay.jsx'
import { dispatch } from './state/store.js'

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)

export default function App() {
  useEffect(() => {
    // until the fukusa veil lands, the bowl is simply there
    const t = setTimeout(() => dispatch({ type: 'UNVEIL' }), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
    <Canvas
      className="stage"
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [0, 0.35, 0.5], fov: 28, near: 0.01, far: 6 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping // AgX happens in the composer
      }}
    >
      <Stage />
    </Canvas>
    <Overlay />
    </>
  )
}
