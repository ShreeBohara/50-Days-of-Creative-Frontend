import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DEFAULT_PLANET_SETTINGS, sunVectorFromAngles } from '../data/planetConfig'
import planetFragmentShader from '../shaders/planetFragment'
import planetVertexShader from '../shaders/planetVertex'

export default function Planet({ settings = DEFAULT_PLANET_SETTINGS }) {
  const meshRef = useRef(null)
  const materialRef = useRef(null)

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_seed: { value: settings.seed },
      u_oceanLevel: { value: settings.oceanLevel },
      u_mountainHeight: { value: settings.mountainHeight },
      u_sunDirection: {
        value: new THREE.Vector3(...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation)),
      },
    }),
    [settings.seed, settings.oceanLevel, settings.mountainHeight, settings.sunAzimuth, settings.sunElevation],
  )

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return

    meshRef.current.rotation.y += delta * settings.rotationSpeed
    materialRef.current.uniforms.u_time.value = state.clock.elapsedTime
    materialRef.current.uniforms.u_seed.value = settings.seed
    materialRef.current.uniforms.u_oceanLevel.value = settings.oceanLevel
    materialRef.current.uniforms.u_mountainHeight.value = settings.mountainHeight
    materialRef.current.uniforms.u_sunDirection.value.set(
      ...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation),
    )
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.45, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={planetVertexShader}
        fragmentShader={planetFragmentShader}
      />
    </mesh>
  )
}
