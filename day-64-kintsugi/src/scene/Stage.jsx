import { Suspense, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { ContactShadows, Environment, useTexture } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { ASSETS } from './assets.js'
import CameraRig from './CameraRig.jsx'
import Effects from './Effects.jsx'
import PhysicsClock from './PhysicsClock.jsx'
import Tray from './Tray.jsx'
import Bowl from './Bowl.jsx'
import Listener from './Listener.jsx'
import { rt } from '../state/store.js'
import DebugHandle from './DebugHandle.jsx'

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)

// 2700 K dusk key light through a shoji lattice — the only shadow caster.
function KeyLight() {
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
        color="#ffc58a"
        intensity={14}
        distance={0}
        decay={2}
        angle={0.3}
        penumbra={0.65}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.0015}
        shadow-camera-near={0.3}
        shadow-camera-far={2.2}
      />
    </>
  )
}

function Lights() {
  return (
    <>
      <KeyLight />
      {/* cool rim from the right so the glaze separates from the umber */}
      <directionalLight position={[0.8, 0.35, -0.5]} intensity={0.35} color="#9fb6d9" />
      <hemisphereLight args={['#f1e7d3', '#1f1712', 0.18]} />
    </>
  )
}

function CameraBinder() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    rt.camera = camera
  }, [camera])
  return null
}

export default function Stage() {
  return (
    <>
      <color attach="background" args={['#1f1712']} />
      <fog attach="fog" args={['#1f1712', 0.75, 1.6]} />
      <CameraBinder />
      {DEBUG ? <DebugHandle /> : null}
      <CameraRig />
      <Listener />
      <Suspense fallback={null}>
        <Environment
          files={ASSETS.hdri}
          environmentIntensity={0.55}
          environmentRotation={[0, 0.9, 0]}
        />
        <Lights />
        <Physics paused timeStep="vary" gravity={[0, -9.81, 0]}>
          <PhysicsClock />
          <Tray />
          <Bowl />
        </Physics>
        <ContactShadows
          position={[0, 0.0004, 0]}
          scale={0.5}
          far={0.12}
          blur={2.4}
          opacity={0.55}
          resolution={512}
          color="#120c08"
        />
      </Suspense>
      <Effects />
    </>
  )
}
