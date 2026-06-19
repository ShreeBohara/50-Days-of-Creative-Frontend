import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

export default function CameraRig({ target = null }) {
  const camera = useThree((state) => state.camera)
  const lookAtTarget = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame(() => {
    if (!target) return

    lookAtTarget.set(target.x, target.y, target.z)
    camera.lookAt(lookAtTarget)
  })

  return null
}
