import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Component, useEffect, useState } from 'react'
import Stage from './scene/Stage.jsx'
import BookRoot from './scene/BookRoot.jsx'
import CameraRig from './scene/CameraRig.jsx'
import Effects from './scene/Effects.jsx'
import Overlay from './ui/Overlay.jsx'
import DebugHandle from './scene/DebugHandle.jsx'
import XRay from './scene/XRay.jsx'
import PerfProbe from './scene/PerfProbe.jsx'
import { rt, useStore } from './state/store.js'

// Tier C: phones and coarse pointers get smaller prints, a smaller shadow map
// and no tilt-shift. ?tier=C forces it for QA.
const TIER =
  typeof window === 'undefined'
    ? 'A'
    : /[?&]tier=c/i.test(location.search) || matchMedia('(pointer: coarse)').matches || innerWidth < 700
      ? 'C'
      : 'A'
rt.tier = TIER
const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)
const PERF = typeof location !== 'undefined' && /[?&]perf=1/.test(location.search)
rt.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Render at most ~3.4 million pixels and never above 1.75× density.
const PIXEL_BUDGET = 3.4e6
function budgetDpr() {
  const cap = TIER === 'C' ? 1.5 : 1.75
  const byBudget = Math.sqrt(PIXEL_BUDGET / Math.max(1, innerWidth * innerHeight))
  return Math.max(1, Math.min(window.devicePixelRatio || 1, cap, byBudget))
}

/**
 * If the 3D book fails at runtime (WebGL2 refused after the gate passed, a
 * driver error), show the book's contents as a plain page instead of a blank
 * screen.
 */
class Guard extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error(err)
    // stop printing for a book nobody will see; show the notice at once
    rt.press?.dispose()
    const why = 'Its 3D view couldn’t start in this browser.'
    document.documentElement.classList.add('no-webgl')
    const note = document.querySelector('.fallback__why')
    if (note) note.textContent = why
    import('./fallback.js')
      .then(({ renderFallback }) => renderFallback(why))
      .catch(() => {})
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  return (
    <Guard>
      <Book />
    </Guard>
  )
}

function Book() {
  const cursor = useStore((s) => s.cursor)
  const [dpr, setDpr] = useState(budgetDpr)
  // keep to the pixel budget when the window grows, or moves to a screen with
  // a different density
  useEffect(() => {
    let raf = 0
    let mq = null
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setDpr(budgetDpr()))
    }
    const watchDensity = () => {
      mq?.removeEventListener('change', onDensity)
      mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      mq.addEventListener('change', onDensity)
    }
    const onDensity = () => {
      update()
      watchDensity()
    }
    window.addEventListener('resize', update)
    watchDensity()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      mq?.removeEventListener('change', onDensity)
    }
  }, [])
  return (
    <>
      <Canvas
        className="stage"
        frameloop="demand"
        flat
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={dpr}
        camera={{ fov: 30, near: 2, far: 420, position: [14, 96, 64] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ cursor }}
      >
        <Stage tier={TIER} />
        <BookRoot tier={TIER} />
        <CameraRig />
        <XRay />
        <Effects tier={TIER} />
        {DEBUG ? <DebugHandle /> : null}
      </Canvas>
      <Overlay />
      {PERF ? <PerfProbe /> : null}
    </>
  )
}
