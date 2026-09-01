import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, MeshReflectorMaterial } from '@react-three/drei'
import Blob from './Blob.jsx'
import Effects from './Effects.jsx'

// Dark reflective slab under the blob — catches the glow and the
// blurred silhouette, which is most of the "club floor" atmosphere.
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
      <planeGeometry args={[26, 26]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={512}
        mixBlur={0.95}
        mixStrength={2.4}
        depthScale={0.6}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0a0612"
        metalness={0.45}
        roughness={0.9}
        mirror={0.45}
      />
    </mesh>
  )
}

// QA bridge: browsers pause requestAnimationFrame in hidden tabs, which
// freezes the frameloop and makes automated visual checks impossible.
// resonance.pump(n) advances n frames by hand through R3F's advance().
function FramePump() {
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    const pump = (n = 1) => {
      let t = performance.now()
      for (let i = 0; i < n; i += 1) {
        t += 16.7
        advance(t)
      }
    }
    window.resonance = { ...(window.resonance || {}), pump }
  }, [advance])
  return null
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 3.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#060309']} />
      {/* dim fill so the dark side never reads as a hole in the page */}
      <ambientLight intensity={0.25} />
      {/* warm key, high left — the "stage light" */}
      <directionalLight position={[2.5, 3, 2]} intensity={1.1} color="#ffd9c4" />
      {/* cool rim from behind-right to carve the silhouette out of the dark */}
      <pointLight position={[-3, -1, -2.5]} intensity={6} color="#6a4dff" />
      <Blob />
      <Floor />
      <Effects />
      <FramePump />
      <OrbitControls
        enablePan={false}
        minDistance={2.1}
        maxDistance={6.5}
        maxPolarAngle={Math.PI / 2 + 0.12}
        autoRotate
        autoRotateSpeed={0.55}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
