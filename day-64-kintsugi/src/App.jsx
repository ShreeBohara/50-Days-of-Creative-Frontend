import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh'
import { useEffect, useRef, useState } from 'react'
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

// R3F raycasts every object with a pointer handler on every move; with a
// bounds tree a 24k-triangle bowl is a handful of box tests, not 24k triangles.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

// Render at most ~3.6 million pixels (and never above 1.5× density): a
// full-screen retina MacBook would otherwise shade 7 million per frame.
const PIXEL_BUDGET = 3.6e6
function budgetDpr(tier) {
  const cap = tier === 'C' ? 1.25 : 1.5
  const byBudget = Math.sqrt(PIXEL_BUDGET / Math.max(1, innerWidth * innerHeight))
  return Math.max(1, Math.min(window.devicePixelRatio || 1, cap, byBudget))
}

function rtInit(tier) {
  rt.tier = tier
  rt.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function App() {
  const run = useStore((s) => s.run)
  const loaded = useStore((s) => s.loaded)
  const [dpr, setDpr] = useState(() => budgetDpr(TIER))
  // A resolution change resizes every composer target (a hitch and a visible
  // change of look), so the monitor's verdict waits for a cut: under the silk,
  // on the shelf, or the next change of phase — never mid-gesture.
  const want = useRef(null)
  const offer = (next) => {
    const phase = store.get().phase
    if (phase === 'veiled' || phase === 'keep') setDpr(next)
    else want.current = next
  }
  useEffect(() => {
    let phase = store.get().phase
    return store.subscribe(() => {
      const now = store.get().phase
      if (now === phase) return
      phase = now
      if (want.current != null) {
        setDpr(want.current)
        want.current = null
      }
    })
  }, [])
  useEffect(() => {
    // a #bowl= link from a friend lands on this shelf
    const got = takeFriendFromHash()
    if (got) {
      store.set({ shelf: got.shelf, hint: 'a bowl from a friend is on your shelf' })
      setTimeout(() => store.get().hint === 'a bowl from a friend is on your shelf' && store.set({ hint: null }), 5200)
    }
    // A mouse press already counts as a user activation, so the very first
    // silk pull is heard; touch browsers only grant audio on pointerup.
    const unlock = () => audio.unlock()
    const unlockMouse = (e) => e.pointerType === 'mouse' && audio.unlock()
    window.addEventListener('pointerdown', unlockMouse, true)
    window.addEventListener('pointerup', unlock)
    const unbindKeys = bindKeyboard()
    return () => {
      window.removeEventListener('pointerdown', unlockMouse, true)
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
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={dpr}
          raycaster={{ firstHitOnly: true }}
          camera={{ position: [0, 0.35, 0.5], fov: 28, near: 0.01, far: 6 }}
          gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping // AgX happens in the composer
          }}
        >
          {/* measured only once warm-up is done: uploads and compiles aren't the steady state */}
          {loaded ? (
            <PerformanceMonitor
              flipflops={4}
              onDecline={() => offer(Math.max(0.85, +((want.current ?? dpr) - 0.2).toFixed(2)))}
              onIncline={() => offer(Math.min(budgetDpr(TIER), +((want.current ?? dpr) + 0.2).toFixed(2)))}
            />
          ) : null}
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
