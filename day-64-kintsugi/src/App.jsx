import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useState } from 'react'
import Stage from './scene/Stage.jsx'
import Overlay from './ui/Overlay.jsx'
import { rt, store, useStore } from './state/store.js'
import { takeFriendFromHash } from './state/shelf.js'
import { audio } from './audio/engine.js'
import { bindKeyboard } from './input/keyboard.js'

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)
// Tier C: phones and coarse pointers get a lighter frame (no AO, smaller
// shadow map, capped DPR). ?tier=C forces it for QA.
const TIER =
  typeof window === 'undefined'
    ? 'A'
    : /[?&]tier=c/i.test(location.search) || matchMedia('(pointer: coarse)').matches || innerWidth < 700
      ? 'C'
      : 'A'
rtInit(TIER)

function rtInit(tier) {
  rt.tier = tier
  rt.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function App() {
  const run = useStore((s) => s.run)
  const [dpr, setDpr] = useState(() => (TIER === 'C' ? 1.25 : Math.min(2, window.devicePixelRatio || 1)))
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
    const unbindKeys = bindKeyboard()
    return () => {
      window.removeEventListener('pointerup', unlock)
      unbindKeys()
    }
  }, [])
  return (
    <>
      <a className="keys-hint" href="#stage">
        keyboard: space lifts · arrows move · M mends · B J A tools · hold space to work · F turns it over
      </a>
      <div
        id="stage"
        tabIndex={0}
        className="stage-wrap"
        role="application"
        aria-label="Kintsugi. A hand-thrown tea bowl on a wooden tray, under a silk cloth."
        aria-describedby="how"
      >
        <Canvas
          className="stage"
          shadows={{ type: THREE.PCFSoftShadowMap }}
          dpr={dpr}
          camera={{ position: [0, 0.35, 0.5], fov: 28, near: 0.01, far: 6 }}
          gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping // AgX happens in the composer
          }}
        >
          <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.5))} flipflops={3} />
          <Stage key={run} tier={TIER} />
        </Canvas>
      </div>
      <p id="how" className="visually-hidden">
        Pull the silk cloth off the bowl, or press Enter. Press and drag the bowl to lift it; let go high and it
        breaks, low and it is set down. Tap it to hear it ring. With the keyboard, Space lifts and lets go, the arrow
        keys move it, W and S raise and lower it, T rings it. Mend the pieces from the foot outward: drag each piece
        near its place and it locks in, or press M to fit the next one. Then pick up the brush with B and brush the
        cracks with lacquer, the jar with J to sift gold as the bowl turns, and the agate with A to burnish it; hold
        Space to work with the keyboard. Q and E turn the bowl. When it is kept, F turns it over to show the seal, S
        shares it and R begins again. Hold Alt or L for a close-up loupe.
      </p>
      <Overlay />
    </>
  )
}
