import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Blob from './Blob.jsx'

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
      <OrbitControls
        enablePan={false}
        minDistance={2.1}
        maxDistance={6.5}
        autoRotate
        autoRotateSpeed={0.55}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
