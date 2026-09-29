import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect } from 'react'
import Stage from './scene/Stage.jsx'
import Overlay from './ui/Overlay.jsx'
import { store, useStore } from './state/store.js'
import { takeFriendFromHash } from './state/shelf.js'
import { audio } from './audio/engine.js'

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)

export default function App() {
  const run = useStore((s) => s.run)
  useEffect(() => {
    // a #bowl= link from a friend lands on this shelf
    const got = takeFriendFromHash()
    if (got) {
      store.set({ shelf: got.shelf, hint: 'a bowl from a friend is on your shelf' })
      setTimeout(() => store.get().hint === 'a bowl from a friend is on your shelf' && store.set({ hint: null }), 5200)
    }
    // touch browsers only grant audio on pointerup, not pointerdown
    const unlock = () => audio.unlock()
    window.addEventListener('pointerup', unlock)
    return () => window.removeEventListener('pointerup', unlock)
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
      <Stage key={run} />
    </Canvas>
    <Overlay />
    </>
  )
}
