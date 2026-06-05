import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sunVectorFromAngles } from '../data/planetConfig'
import cloudFragmentShader from '../shaders/cloudFragment'
import cloudVertexShader from '../shaders/cloudVertex'

export default function CloudLayer({ settings }) {
  const meshRef = useRef(null)
  const materialRef = useRef(null)

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_seed: { value: settings.seed },
      u_cloudDensity: { value: settings.cloudDensity },
      u_sunDirection: {
        value: new THREE.Vector3(...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation)),
      },
    }),
    [settings.cloudDensity, settings.seed, settings.sunAzimuth, settings.sunElevation],
  )

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return

    meshRef.current.rotation.y += delta * (settings.rotationSpeed + 0.055)
    materialRef.current.uniforms.u_time.value = state.clock.elapsedTime
    materialRef.current.uniforms.u_seed.value = settings.seed + 17.0
    materialRef.current.uniforms.u_cloudDensity.value = settings.cloudDensity
    materialRef.current.uniforms.u_sunDirection.value.set(
      ...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation),
    )
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.505, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
