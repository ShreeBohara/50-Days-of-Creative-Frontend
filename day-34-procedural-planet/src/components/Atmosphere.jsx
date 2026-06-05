import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sunVectorFromAngles } from '../data/planetConfig'
import atmosphereFragmentShader from '../shaders/atmosphereFragment'
import atmosphereVertexShader from '../shaders/atmosphereVertex'

export default function Atmosphere({ settings }) {
  const materialRef = useRef(null)

  const uniforms = useMemo(
    () => ({
      u_thickness: { value: settings.atmosphereThickness },
      u_sunDirection: {
        value: new THREE.Vector3(...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation)),
      },
      u_color: { value: new THREE.Color('#38bdf8') },
    }),
    [settings.atmosphereThickness, settings.sunAzimuth, settings.sunElevation],
  )

  useFrame(() => {
    if (!materialRef.current) return

    materialRef.current.uniforms.u_thickness.value = settings.atmosphereThickness
    materialRef.current.uniforms.u_sunDirection.value.set(
      ...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation),
    )
  })

  return (
    <mesh scale={1 + settings.atmosphereThickness * 0.22}>
      <sphereGeometry args={[1.56, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
