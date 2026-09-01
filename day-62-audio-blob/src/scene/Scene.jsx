import { Canvas } from '@react-three/fiber'

// Placeholder body — swapped for the audio-reactive shader blob in the
// blob-geometry stage. Exists so lighting can be tuned against a real surface.
function ProtoBlob() {
  return (
    <mesh>
      <icosahedronGeometry args={[1, 8]} />
      <meshStandardMaterial color="#241a38" roughness={0.25} metalness={0.55} />
    </mesh>
  )
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
      <ProtoBlob />
    </Canvas>
  )
}
