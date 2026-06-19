import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCityById, getDatasetRoutes } from '../utils/data'
import { greatCirclePoints } from '../utils/geo'
import { GLOBE_RADIUS } from './EarthGlobe'

function colorForIntensity(intensity) {
  const low = new THREE.Color('#22c55e')
  const mid = new THREE.Color('#22d3ee')
  const high = new THREE.Color('#ef4444')

  if (intensity < 0.58) return low.lerp(mid, intensity / 0.58)
  return mid.lerp(high, (intensity - 0.58) / 0.42)
}

function RoutePulse({ color, curve, offset, reducedMotion, speed }) {
  const pulseRef = useRef(null)

  useFrame(({ clock }) => {
    if (!pulseRef.current) return

    const t = reducedMotion ? offset : (clock.elapsedTime * speed + offset) % 1
    pulseRef.current.position.copy(curve.getPoint(t))
  })

  return (
    <mesh ref={pulseRef}>
      <sphereGeometry args={[0.025, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.92} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function RouteArc({ route, index, reducedMotion }) {
  const from = getCityById(route.from)
  const to = getCityById(route.to)
  const color = useMemo(() => colorForIntensity(route.intensity), [route.intensity])
  const curve = useMemo(() => {
    const points = greatCirclePoints(from, to, {
      segments: 56,
      radius: GLOBE_RADIUS * 1.025,
      altitude: 0.2 + route.intensity * 0.34,
    }).map((point) => new THREE.Vector3(point.x, point.y, point.z))

    return new THREE.CatmullRomCurve3(points)
  }, [from, route.intensity, to])
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 96, 0.004 + route.intensity * 0.004, 8, false), [
    curve,
    route.intensity,
  ])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <RoutePulse
        color={color}
        curve={curve}
        offset={(index * 0.071) % 1}
        reducedMotion={reducedMotion}
        speed={0.08 + route.intensity * 0.05}
      />
    </group>
  )
}

export default function DataArcs({ datasetKey = 'flightRoutes', reducedMotion = false }) {
  const routes = getDatasetRoutes(datasetKey)

  return (
    <group>
      {routes.map((route, index) => (
        <RouteArc index={index} key={`${route.from}-${route.to}-${route.label}`} reducedMotion={reducedMotion} route={route} />
      ))}
    </group>
  )
}
