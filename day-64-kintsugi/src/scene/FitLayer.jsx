import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { Fitting } from './fitting.js'
import { makeGhostMaterial } from './materials.js'
import { toClient } from '../input/pointer.js'
import { rt, store } from '../state/store.js'

const WARM = new THREE.Color('#f6e7c8') // makeGhostMaterial's own colour
const COOL = new THREE.Color('#7f96b8') // "not yet": cold, and dimmer
const PICK_PX = { mouse: 28, touch: 44 }

const _com = new THREE.Vector3()
const _px = { x: 0, y: 0, z: 0 }

// A press that just misses a thin shard shouldn't spin the bowl: the loose
// piece whose centre is drawn nearest the press, if it's within PICK_PX.
function nearestLoose(ctl, camera, canvas, ev) {
  const bodies = rt.shardBodies
  if (!bodies) return null
  let best = null
  let bestD = ev.pointerType === 'touch' ? PICK_PX.touch : PICK_PX.mouse
  for (const [id, body] of bodies) {
    if (ctl.placed.has(id) || ctl.anims.has(id)) continue
    if (rt.shardMeshes?.get(id)?.visible === false) continue
    const t = body.translation()
    toClient(_com.set(t.x, t.y, t.z), camera, canvas, _px)
    if (_px.z > 1) continue // behind the camera
    const d = Math.hypot(_px.x - ev.clientX, _px.y - ev.clientY)
    if (d < bestD) {
      bestD = d
      best = id
    }
  }
  return best
}

// Hosts the mend controller: the assembly frame the bowl is rebuilt in, the
// ghost that shows where a piece belongs, and the phase hook that starts it.
export default function FitLayer() {
  const { rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ctl = useMemo(() => new Fitting(), [])
  const ghost = useRef(null)
  const ghostMat = useMemo(() => makeGhostMaterial(), [])
  const fx = useRef({ cant: 0, flash: 0, seated: false })

  useEffect(() => {
    ctl.bind({ rapier, camera, canvas: gl.domElement })
    rt.fit = ctl
    rt.assembly = ctl.assembly
    let last = store.get().phase
    const unsub = store.subscribe(() => {
      const phase = store.get().phase
      if (phase === last) return
      last = phase
      if (phase === 'fitting') ctl.begin()
    })
    // a press that no shard claimed: a near miss still takes the nearest
    // loose piece; anything else turns the assembly
    const down = (ev) => {
      if (ev.__kintsugiHit || ev.target !== gl.domElement) return
      const phase = store.get().phase
      if ((phase === 'fitting' || phase === 'broken') && !ctl.hold) {
        const id = nearestLoose(ctl, camera, gl.domElement, ev)
        if (id != null && ctl.onShardDown(ev, id)) {
          ev.__kintsugiHit = true // the long-press loupe leaves it alone too
          return
        }
      }
      ctl.onEmptyDown(ev)
    }
    const key = (ev) => {
      if ((ev.key === 'm' || ev.key === 'M') && store.get().phase === 'fitting') ctl.autoFitNext()
      if ((ev.key === 'f' || ev.key === 'F') && !ev.repeat && store.get().phase === 'keep') ctl.toggleFlip()
    }
    const dbl = () => {
      if (store.get().phase === 'keep') ctl.toggleFlip()
    }
    gl.domElement.addEventListener('dblclick', dbl)
    window.addEventListener('pointerdown', down)
    window.addEventListener('keydown', key)
    return () => {
      unsub()
      ctl.end()
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('keydown', key)
      gl.domElement.removeEventListener('dblclick', dbl)
      rt.fit = null
    }
  }, [ctl, rapier, camera, gl])

  // before the physics step (priority -10), so this frame's step applies this
  // frame's kinematic targets and the seam ribbons never lead the shards
  useFrame((_, dt) => ctl.frame(dt), -20)

  useFrame((state, dt) => {
    const g = ghost.current
    if (!g) return
    const h = ctl.hold
    const id = h ? h.id : ctl.ghostId
    const s = id != null ? rt.variant?.shards[id] : null
    const f = fx.current
    g.visible = !!s
    if (!s || !h) {
      f.cant = 0
      f.flash = 0
      f.seated = false
    }
    if (!s) return
    if (g.geometry !== s.geometry) g.geometry = s.geometry
    g.position.copy(s.com)
    const m = g.material
    if (!h) {
      // the idle fallback: the next piece that would fit, breathing slowly
      g.scale.setScalar(1)
      m.color.copy(WARM)
      m.opacity = rt.reduced ? 0.16 : 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3.2))
      return
    }
    // The held piece's own home: brightens with the magnet's pull, flashes
    // once when a release would seat it, and turns cold and dim near home
    // while it has nothing to attach to yet. A hair larger than the piece, so
    // the seated glow sits on its surface without z-fighting.
    f.cant += ((h.near && h.blocked ? 1 : 0) - f.cant) * (1 - Math.exp(-dt / 0.08))
    if (h.seated && !f.seated && !rt.reduced) f.flash = 1
    f.seated = h.seated
    f.flash *= Math.exp(-dt / 0.14)
    const warm = 0.06 + 0.4 * h.pull + 0.18 * f.flash
    m.opacity = warm + (0.08 - warm) * f.cant
    m.color.lerpColors(WARM, COOL, f.cant)
    g.scale.setScalar(1.02)
  })

  return (
    <primitive object={ctl.assembly}>
      <mesh ref={ghost} material={ghostMat} visible={false} renderOrder={3} />
    </primitive>
  )
}
