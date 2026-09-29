import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { Fitting } from './fitting.js'
import { rt, store } from '../state/store.js'

// Hosts the mend controller: the assembly frame the bowl is rebuilt in, the
// ghost that hints where a piece belongs, and the phase hook that starts it.
export default function FitLayer() {
  const { rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ctl = useMemo(() => new Fitting(), [])
  const ghost = useRef(null)
  const ghostMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f6e7c8',
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

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
    // a press that no shard claimed turns the assembly
    const down = (ev) => {
      if (!ev.__kintsugiHit && ev.target === gl.domElement) ctl.onEmptyDown(ev)
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

  useFrame((state) => {
    const g = ghost.current
    if (!g) return
    const id = ctl.ghostId
    const s = id != null ? rt.variant?.shards[id] : null
    g.visible = !!s
    if (s) {
      if (g.geometry !== s.geometry) g.geometry = s.geometry
      g.position.copy(s.com)
      g.material.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3.2))
    }
  })

  return (
    <primitive object={ctl.assembly}>
      <mesh ref={ghost} material={ghostMat} visible={false} renderOrder={3} />
    </primitive>
  )
}
