import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ASSETS } from './assets.js'
import CameraRig from './CameraRig.jsx'
import Effects from './Effects.jsx'
import Veil from './Veil.jsx'
import Listener from './Listener.jsx'
import { rt, store } from '../state/store.js'
import DebugHandle from './DebugHandle.jsx'
import ShadowGate from './ShadowGate.jsx'
import PerfProbe from './PerfProbe.jsx'
import { extrasFor, warmUp } from './warmup.js'

const PhysicsScene = lazy(() => import('./PhysicsScene.jsx'))

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)
const PERF = typeof location !== 'undefined' && /[?&]perf=1/.test(location.search)

// 2700 K dusk key light through a shoji lattice — the only shadow caster.
// The display light follows the visitor's clock: cool morning, neutral noon,
// the 2700 K dusk this piece was lit for, a dim lamp-warm night.
function keyForHour(h) {
  if (h >= 6 && h < 11) return { color: '#ffd6ad', intensity: 13 }
  if (h >= 11 && h < 16) return { color: '#ffe6c9', intensity: 13.5 }
  if (h >= 16 && h < 21) return { color: '#ffc58a', intensity: 14 }
  return { color: '#ffb06a', intensity: 11 }
}

function KeyLight({ tier }) {
  const [key] = useState(() => keyForHour(new Date().getHours()))
  const gobo = useTexture(ASSETS.gobo, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
  })
  const target = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <primitive object={target} position={[0.02, 0, 0]} />
      <spotLight
        target={target}
        map={gobo}
        position={[-0.5, 0.82, 0.52]}
        color={key.color}
        intensity={key.intensity}
        distance={0}
        decay={2}
        angle={0.3}
        penumbra={0.65}
        castShadow={!/[?&]shadow=0/.test(location.search)}
        shadow-mapSize={tier === 'C' ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.0015}
        shadow-camera-near={0.3}
        shadow-camera-far={2.2}
      />
    </>
  )
}

function Lights({ tier }) {
  return (
    <>
      <KeyLight tier={tier} />
      {/* cool rim from the right so the glaze separates from the umber */}
      <directionalLight position={[0.8, 0.35, -0.5]} intensity={0.35} color="#9fb6d9" />
      <hemisphereLight args={['#f1e7d3', '#1f1712', 0.18]} />
    </>
  )
}

// Mounted last inside the Suspense boundary: everything heavy has arrived.
// Compile every program the ritual will need before the silk can come off.
function Loaded() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let alive = true
    warmUp(gl, scene, camera, extrasFor(rt.ceramic)).then((ms) => {
      if (!alive) return
      rt.warmupMs = Math.round(ms)
      store.set({ loaded: true })
    })
    return () => {
      alive = false
      store.set({ loaded: false })
    }
  }, [gl, scene, camera])
  return null
}

function CameraBinder() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    rt.camera = camera
  }, [camera])
  return null
}

export default function Stage({ tier = 'A' }) {
  return (
    <>
      <color attach="background" args={['#1f1712']} />
      <fog attach="fog" args={['#1f1712', 0.75, 1.6]} />
      <CameraBinder />
      <ShadowGate />
      {DEBUG ? <DebugHandle /> : null}
      {PERF ? <PerfProbe /> : null}
      <CameraRig />
      <Listener />
      {/* the veil and a soft pre-light render before any asset arrives */}
      <Veil />
      <directionalLight position={[-0.5, 0.8, 0.5]} intensity={1.1} color="#ffd2a6" />
      <Suspense fallback={null}>
        <Environment
          files={ASSETS.hdri}
          environmentIntensity={0.55}
          environmentRotation={[0, 0.9, 0]}
        />
        <Lights tier={tier} />
        <PhysicsScene />
        <Loaded />
      </Suspense>
      <Effects />
    </>
  )
}
