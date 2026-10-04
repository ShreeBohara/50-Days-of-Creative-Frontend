// The reader's eye. Frames the shut book on the mat, then the open spread from
// the tail of the book at a reading angle, with a breath of parallax from the
// pointer so the paper reads as depth. Background drags orbit (or, on a
// narrow portrait screen, slide along the spread); the wheel (or a trackpad
// pinch) zooms. The camera also follows window resizes.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { rt, store } from '../state/store.js'

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))

export default function CameraRig() {
  const { camera, size, gl } = useThree()
  const s = useRef({ az: -0.12, el: 0.98, dist: 120, tx: 10, ty: 0, tz: 0, user: { az: 0, el: 0, zoom: 1, pan: 0 }, drag: null })

  useEffect(() => {
    rt.camera = camera
    const st = s.current
    rt.orbit = {
      begin(x, y) {
        st.drag = { x, y, az: st.user.az, el: st.user.el, pan: st.user.pan }
      },
      move(x, y) {
        const d = st.drag
        if (!d) return
        const portrait = size.width / size.height < 0.8
        if (portrait) st.user.pan = THREE.MathUtils.clamp(d.pan - ((x - d.x) / size.width) * 30, -16, 16)
        else st.user.az = THREE.MathUtils.clamp(d.az - ((x - d.x) / size.width) * 1.6, -0.6, 0.6)
        st.user.el = THREE.MathUtils.clamp(d.el + ((y - d.y) / size.height) * 1.2, -0.42, 0.34)
      },
      end() {
        st.drag = null
      },
      /** frame a shot (QA via __d65, the social card): { az, el, zoom, pan } offsets */
      set(v) {
        Object.assign(st.user, v)
      },
    }
    const wheel = (e) => {
      e.preventDefault()
      st.user.zoom = THREE.MathUtils.clamp(st.user.zoom * Math.exp(e.deltaY * 0.0012), 0.55, 1.35)
    }
    gl.domElement.addEventListener('wheel', wheel, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', wheel)
  }, [camera, gl, size])

  useFrame((state, dtRaw) => {
    const dt = Math.min(rt.fixedDt ?? dtRaw, 1 / 20)
    const st = s.current
    const open = store.get().spread >= 0 || (rt.book && rt.book.phi[0] > 0.5)
    const aspect = size.width / size.height
    const vfov = (camera.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    const portrait = aspect < 0.8
    // what must fit: the open spread with its pop-ups, or the shut book
    const halfW = open ? (portrait ? 15.5 : 23.5) : 15
    const halfH = open ? 15.5 : 17.5
    const fit = Math.max(halfW / Math.tan(hfov / 2), halfH / Math.tan(vfov / 2))
    const tAz = (open ? 0 : -0.16) + st.user.az + (rt.reduced ? 0 : (rt.pointer.x - 0.5) * 0.07)
    const tEl = (open ? 0.92 : 1.05) + st.user.el + (rt.reduced ? 0 : (rt.pointer.y - 0.5) * 0.04)
    const tx = (open ? 0 : 10.2) + (portrait ? st.user.pan : 0)
    const k = st.drag ? 14 : 3.2
    st.az = damp(st.az, tAz, k, dt)
    st.el = damp(st.el, THREE.MathUtils.clamp(tEl, 0.5, 1.32), k, dt)
    st.dist = damp(st.dist, fit * st.user.zoom, 3.2, dt)
    st.tx = damp(st.tx, tx, 3.2, dt)
    st.ty = damp(st.ty, open ? 3.4 : 0, 3.2, dt)
    st.tz = damp(st.tz, open ? 1.6 : 0.4, 3.2, dt)
    const ce = Math.cos(st.el)
    camera.position.set(st.tx + Math.sin(st.az) * ce * st.dist, st.ty + Math.sin(st.el) * st.dist, st.tz + Math.cos(st.az) * ce * st.dist)
    camera.lookAt(st.tx, st.ty, st.tz)
    // keep frames coming until the eye has settled (frameloop "demand")
    const settling =
      Math.abs(st.az - tAz) > 1e-4 ||
      Math.abs(st.el - THREE.MathUtils.clamp(tEl, 0.5, 1.32)) > 1e-4 ||
      Math.abs(st.dist - fit * st.user.zoom) > 0.01 ||
      Math.abs(st.tx - tx) > 0.005 ||
      Math.abs(st.ty - (open ? 3.4 : 0)) > 0.005 ||
      Math.abs(st.tz - (open ? 1.6 : 0.4)) > 0.005
    if (settling) state.invalidate()
  })
  return null
}
