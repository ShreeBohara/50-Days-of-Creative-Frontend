import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Stage from './scene/Stage.jsx'

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)

export default function App() {
  return (
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
  )
}
