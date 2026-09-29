import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { easing } from 'maath'
import { rt, store } from '../state/store.js'

// Per-phase framing, eased with critically damped springs (no bounce). The
// rig fits the tray's width to the viewport aspect so portrait phones see the
// whole working area instead of a crop.
const VIEWS = {
  table: { target: [0, 0.04, 0.0], polar: 58, dist: 0.5, yaw: 0 },
  broken: { target: [0, 0.02, 0.0], polar: 50, dist: 0.62, yaw: 0 },
  work: { target: [-0.012, 0.045, -0.004], polar: 56, dist: 0.5, yaw: 0 },
  keep: { target: [0, 0.045, 0.0], polar: 66, dist: 0.46, yaw: 0 },
}

function viewFor(phase) {
  if (phase === 'broken') return VIEWS.broken
  if (phase === 'fitting' || phase === 'lacquer' || phase === 'gild' || phase === 'burnish') return VIEWS.work
  if (phase === 'keep') return VIEWS.keep
  return VIEWS.table
}

export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), cur: new THREE.Vector3(0, 0.035, 0) }), [])

  useFrame((state, dt) => {
    if (rt.debug.freezeCam) return // QA: hold a hand-placed camera
    const v = viewFor(store.get().phase)
    const aspect = size.width / Math.max(1, size.height)
    // keep ~0.40 m of tray visible horizontally in portrait
    const fitDist = aspect < 1 ? v.dist * Math.min(1.9, 0.92 / aspect) : v.dist
    const polar = THREE.MathUtils.degToRad(aspect < 1 ? v.polar - 8 : v.polar)
    const drift = Math.sin(state.clock.elapsedTime * 0.1) * 0.012 // the slow museum drift
    const yaw = v.yaw + drift
    tmp.pos.set(
      v.target[0] + fitDist * Math.sin(polar) * Math.sin(yaw),
      v.target[1] + fitDist * Math.cos(polar),
      v.target[2] + fitDist * Math.sin(polar) * Math.cos(yaw),
    )
    easing.damp3(camera.position, tmp.pos, 0.6, dt)
    tmp.look.set(...v.target)
    easing.damp3(tmp.cur, tmp.look, 0.5, dt)
    camera.lookAt(tmp.cur)
  })
  return null
}
