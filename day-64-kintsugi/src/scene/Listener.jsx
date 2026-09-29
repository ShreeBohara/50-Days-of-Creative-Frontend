import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audio } from '../audio/engine.js'

// The HRTF listener rides the camera, so shard clatter pans with the view.
const fwd = new THREE.Vector3()
const up = new THREE.Vector3()

export default function Listener() {
  useFrame(({ camera }) => {
    camera.getWorldDirection(fwd)
    up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    audio.setListener({ position: camera.position.toArray(), forward: fwd.toArray(), up: up.toArray() })
  })
  return null
}
