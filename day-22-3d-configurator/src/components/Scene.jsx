/**
 * Scene.jsx — R3F Canvas with studio lighting, environment, and shadows
 */
import { Canvas } from '@react-three/fiber'
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei'

function StudioLights() {
  return (
    <>
      {/* Key light — warm, strong */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.8}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Fill light — softer, cooler */}
      <directionalLight
        position={[-4, 4, -2]}
        intensity={0.6}
        color="#e0e8ff"
      />
      {/* Rim light — behind, gives edge definition */}
      <directionalLight
        position={[0, 3, -6]}
        intensity={1.0}
        color="#c8d0ff"
      />
      {/* Subtle ambient so nothing is pitch-black */}
      <ambientLight intensity={0.15} color="#ffffff" />
    </>
  )
}

export default function Scene({ children }) {
  return (
    <Canvas
      camera={{ position: [4, 2, 5], fov: 40, near: 0.1, far: 100 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Studio HDRI for reflections */}
      <Environment preset="studio" environmentIntensity={0.5} />

      {/* Studio lights */}
      <StudioLights />

      {/* Contact shadow on floor */}
      <ContactShadows
        position={[0, -0.49, 0]}
        opacity={0.6}
        scale={12}
        blur={2.5}
        far={4}
        color="#000000"
      />

      {/* Infinite floor plane (subtle reflective surface) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#1a1a24"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Orbit controls with auto-rotate */}
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.5}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.48}
        makeDefault
      />

      {/* 3D model and controls will be injected as children */}
      {children}
    </Canvas>
  )
}
