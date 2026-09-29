import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildRibbonGeometry, makeSeamState } from './ribbons.js'
import { makeCrackMaterial, makeFlakeMaterial, makeSeamMaterial } from './materials.js'
import { Craft, MAX_DUST } from './craft.js'
import { SEVERITY } from '../logic/severity.js'
import { keepBowl, rt, store } from '../state/store.js'

const _o = new THREE.Object3D()

function makeDust() {
  return {
    pos: new Float32Array(MAX_DUST * 3),
    vel: new Float32Array(MAX_DUST * 3),
    hit: new Float32Array(MAX_DUST * 3),
    land: new Float32Array(MAX_DUST),
    life: new Float32Array(MAX_DUST),
    spin: new Float32Array(MAX_DUST),
    state: new Uint8Array(MAX_DUST), // 0 free · 1 falling · 2 stuck · 3 bouncing · 4 on the tray
    onBowl: new Uint8Array(MAX_DUST),
    next: 0,
    seq: 0,
  }
}

// Builds the seam ribbons once every piece is home (or on the unbroken bowl
// for a hairline), then hands them to the craft controller.
export default function CraftLayer() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ctl = useMemo(() => new Craft(), [])
  const dustMesh = useRef(null)
  const dust = useMemo(() => makeDust(), [])
  const flake = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.0009, 0.0007)
    return { g, m: makeFlakeMaterial() }
  }, [])

  useEffect(() => {
    ctl.bind({ camera, canvas: gl.domElement })
    rt.craft = ctl
    rt.craftMeshes = () => {
      if (store.get().severity === SEVERITY.HAIRLINE) return rt.bowl?.mesh ? [rt.bowl.mesh] : []
      return rt.shardMeshes ? [...rt.shardMeshes.values()] : []
    }
    let built = null
    let last = store.get().phase
    const build = () => {
      const v = rt.variant
      if (!v || built) return
      const hair = store.get().severity === SEVERITY.HAIRLINE
      const seams = (rt.activeSeams ?? v.seams.map((_, i) => i)).map((i) => v.seams[i])
      const geo = buildRibbonGeometry(seams)
      const { data, tex } = makeSeamState(seams.length)
      const seamMat = makeSeamMaterial(tex, seams.length)
      const crackMat = makeCrackMaterial()
      crackMat.userData.uniforms.uFront.value = 10 // every crack drawn
      const crack = new THREE.Mesh(geo, crackMat)
      const seam = new THREE.Mesh(geo, seamMat)
      crack.renderOrder = 2
      seam.renderOrder = 3
      const parent = hair ? rt.bowl.mesh : rt.assembly
      if (hair) rt.fit?.rideIntact(rt.bowl.body)
      parent.add(crack, seam)
      built = { crack, seam, geo, seamMat, crackMat, tex, parent }
      rt.seams = built
      ctl.attach({ seams, state: data, tex, parent, dust })
      // turn the cracks toward the viewer: the circular mean of the seams'
      // midpoint azimuths (a hairline's few seams can start on the far side)
      let sx = 0
      let sz = 0
      for (const s of seams) {
        const m = Math.floor(s.n / 2)
        sx += s.pos[m * 3] * s.length
        sz += s.pos[m * 3 + 2] * s.length
      }
      if (rt.fit && Math.hypot(sx, sz) > 1e-6) {
        const az = Math.atan2(sx, sz)
        const y = rt.fit.yaw
        rt.fit.yawTarget = y + Math.atan2(Math.sin(-az - y), Math.cos(-az - y))
      }
    }
    const unsub = store.subscribe(() => {
      const phase = store.get().phase
      if (phase === last) return
      last = phase
      if (phase === 'lacquer') {
        build()
        ctl.setStage('lacquer')
      } else if (phase === 'gild') ctl.setStage('gild')
      else if (phase === 'burnish') {
        ctl.setStage('burnish')
        if (built) built.seamMat.userData.uniforms.uWet.value = 0
      } else if (phase === 'keep') {
        ctl.setStage(null)
        keepBowl()
        // the hairline crack under the gold no longer needs drawing
        if (built) built.crack.visible = false
      }
    })
    return () => {
      unsub()
      ctl.unbind()
      rt.craft = null
      // "begin again" remounts the stage: free this run's GPU resources
      if (built) {
        built.crack.removeFromParent()
        built.seam.removeFromParent()
        built.geo.dispose()
        built.tex.dispose()
        built.seamMat.dispose()
        built.crackMat.dispose()
        rt.seams = null
      }
    }
  }, [ctl, camera, gl, dust])

  useEffect(
    () => () => {
      flake.g.dispose()
      flake.m.dispose()
    },
    [flake],
  )

  useFrame((state, dt) => {
    ctl.frame(dt, state.clock.elapsedTime)
    const m = dustMesh.current
    if (!m) return
    // nothing airborne and nothing drawn last frame: skip the 166 KB upload
    if (m.count === 0 && !dust.state.some(Boolean)) return
    let n = 0
    for (let i = 0; i < MAX_DUST; i++) {
      const s = dust.state[i]
      if (!s) continue
      const fade = s === 2 ? Math.max(0, 1 - dust.life[i] / 0.5) : s === 4 ? Math.max(0, 1 - dust.life[i] / 2.4) : 1
      _o.position.fromArray(dust.pos, i * 3)
      if (s === 2) _o.position.fromArray(dust.hit, i * 3)
      const r = dust.spin[i] + dust.life[i] * (s === 1 || s === 3 ? 9 : 0)
      _o.rotation.set(r, r * 0.7, r * 1.3)
      _o.scale.setScalar(Math.max(0.001, fade))
      _o.updateMatrix()
      m.setMatrixAt(n++, _o.matrix)
    }
    m.count = n
    m.instanceMatrix.clearUpdateRanges()
    m.instanceMatrix.addUpdateRange(0, Math.max(1, n) * 16)
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={(m) => {
        dustMesh.current = m
        if (m) {
          m.count = 0
          m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        }
      }}
      args={[flake.g, flake.m, MAX_DUST]}
      frustumCulled={false}
      castShadow={false}
    />
  )
}
