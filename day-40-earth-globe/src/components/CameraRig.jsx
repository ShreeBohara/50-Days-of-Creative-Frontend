import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { latLngToVector3 } from '../utils/geo'
import { GLOBE_RADIUS } from './EarthGlobe'

export default function CameraRig({ controlsRef, focusCity = null, reducedMotion = false }) {
  const camera = useThree((state) => state.camera)
  const desiredPositionRef = useRef(new THREE.Vector3())
  const focusTargetRef = useRef(new THREE.Vector3())
  const surfaceNormalRef = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!focusCity || !controlsRef.current) return

    const vector = latLngToVector3(focusCity.lat, focusCity.lng, 1)
    const desiredPosition = desiredPositionRef.current
    const focusTarget = focusTargetRef.current
    const surfaceNormal = surfaceNormalRef.current

    surfaceNormal.set(vector.x, vector.y, vector.z).normalize()
    desiredPosition.copy(surfaceNormal).multiplyScalar(4.2)
    desiredPosition.y += 0.25
    focusTarget.copy(surfaceNormal).multiplyScalar(GLOBE_RADIUS * 0.45)

    const lerpSpeed = reducedMotion ? 1 : 0.045
    camera.position.lerp(desiredPosition, lerpSpeed)
    controlsRef.current.target.lerp(focusTarget, lerpSpeed)
    controlsRef.current.update()
  })

  return null
}
