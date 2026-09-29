import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { easing } from 'maath'
import { rt, store } from '../state/store.js'
import { bindLoupe } from '../input/loupe.js'

// Per-phase framing, eased with critically damped springs (no bounce). The
// rig fits the tray's width to the viewport aspect so portrait phones see the
// whole working area instead of a crop.
const VIEWS = {
  table: { target: [0, 0.04, 0.0], polar: 58, dist: 0.5, yaw: 0 },
  work: { target: [-0.012, 0.045, -0.004], polar: 56, dist: 0.5, yaw: 0 },
  keep: { target: [0, 0.045, 0.0], polar: 66, dist: 0.46, yaw: 0 },
}

function viewFor(phase) {
  // the break goes straight to the working framing: one move, not two
  if (phase === 'broken' || phase === 'fitting' || phase === 'lacquer' || phase === 'gild' || phase === 'burnish') {
    return VIEWS.work
  }
  if (phase === 'keep') return VIEWS.keep
  return VIEWS.table
}

// The slow museum drift stops under a working hand — otherwise a held bowl or
// shard slides beneath a still pointer, since pointer→world uses the live
// camera. Its clock slows to a stop (so the camera stays where it is rather
// than swinging back to centre) and picks up again over about a second.
const CALM_IN = 0.12 // s
const CALM_OUT = 0.33 // s

function handAtWork(phase) {
  return (
    phase === 'held' ||
    !!rt.bowl?.hold?.holding ||
    !!rt.fit?.hold ||
    !!rt.fit?.aiming ||
    !!rt.fit?.spin ||
    !!rt.craft?.tool ||
    !!rt.veil?.grabbed
  )
}

export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  useEffect(() => bindLoupe(gl.domElement), [gl])
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), cur: new THREE.Vector3(0, 0.035, 0) }), [])
  // calm: 1 = drifting freely, 0 = held still for a hand; t: the drift's own clock
  const drift = useRef({ calm: 1, t: null })

  useFrame((state, delta) => {
    if (rt.debug.freezeCam) return // QA: hold a hand-placed camera
    const dt = Math.min(delta, 1 / 30) // a hitch shouldn't lurch the camera
    const phase = store.get().phase
    const v = viewFor(phase)
    const aspect = size.width / Math.max(1, size.height)
    // keep ~0.40 m of tray visible horizontally in portrait
    const fitDist = aspect < 1 ? v.dist * Math.min(1.9, 0.92 / aspect) : v.dist
    const polar = THREE.MathUtils.degToRad(aspect < 1 ? v.polar - 8 : v.polar)
    const d = drift.current
    const busy = handAtWork(phase)
    d.calm += ((busy ? 0 : 1) - d.calm) * (1 - Math.exp(-dt / (busy ? CALM_IN : CALM_OUT)))
    d.t = (d.t ?? state.clock.elapsedTime) + dt * d.calm
    const yaw = v.yaw + (rt.reduced ? 0 : Math.sin(d.t * 0.1) * 0.012) // the slow museum drift
    const flip = rt.fit?.flip ?? 0 // a flipped bowl is lifted: follow it up
    // a bowl lifted by keys can go above the frame: rise and pull back with it.
    // Not for a pointer hold — the bowl stays under the pointer, which can't
    // leave the canvas, and a moving camera would move the pointer's target
    // with it (the bowl would climb on its own under a still hand).
    const held = phase === 'held' ? rt.held : null
    const lift = held?.keys && held.out ? THREE.MathUtils.clamp(held.out.y - 0.05, 0, 0.3) : 0
    const dist = fitDist + lift * 0.5
    const ty = v.target[1] + lift * 0.55
    tmp.pos.set(
      v.target[0] + dist * Math.sin(polar) * Math.sin(yaw),
      ty + dist * Math.cos(polar) + flip * 0.03,
      v.target[2] + dist * Math.sin(polar) * Math.cos(yaw),
    )
    easing.damp3(camera.position, tmp.pos, 0.6, dt)
    tmp.look.set(v.target[0], ty + flip * 0.028, v.target[2])
    easing.damp3(tmp.cur, tmp.look, 0.5, dt)
    camera.lookAt(tmp.cur)

    // loupe: a 6× sub-window of the full view, centred on the pointer
    const l = rt.loupe
    if (l) {
      l.amt += ((l.active ? 1 : 0) - l.amt) * (1 - Math.exp(-dt / 0.12))
      if (l.amt > 0.002) {
        const zoom = 1 + 5 * l.amt
        const w = size.width / zoom
        const h = size.height / zoom
        const x = THREE.MathUtils.clamp(l.x - w / 2, 0, size.width - w)
        const y = THREE.MathUtils.clamp(l.y - h / 2, 0, size.height - h)
        camera.setViewOffset(size.width, size.height, x, y, w, h)
        document.documentElement.dataset.loupe = ''
      } else if (camera.view?.enabled) {
        camera.clearViewOffset()
        delete document.documentElement.dataset.loupe
      }
    }
  })
  return null
}
