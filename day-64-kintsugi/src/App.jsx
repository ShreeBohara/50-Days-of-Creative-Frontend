import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <Canvas
      className="stage"
      dpr={[1, 2]}
      camera={{ position: [0, 0.32, 0.52], fov: 32, near: 0.01, far: 20 }}
      gl={{ antialias: false }}
    >
      <color attach="background" args={['#1f1712']} />
    </Canvas>
  )
}
