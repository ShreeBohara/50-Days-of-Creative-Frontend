// The loader is the scene: an indigo fukusa lies over the bowl while the
// models stream in. Once everything is ready its corner stirs; grab the silk
// anywhere and pull it off (Enter does it for you). It's live Verlet cloth, so
// it drapes, drags and slides like fabric.

import * as THREE from 'three'
import { Cloth, GRID } from './cloth.js'
import { BOWL_SLOT } from './geometry.js'
import { audio } from '../audio/engine.js'
import { announce, dispatch, store } from '../state/store.js'
import { facingPlane, pointOnPlane } from '../input/pointer.js'

function twill(size = 128) {
  const data = new Uint8Array(size * size * 4)
  const n = 16
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * n
      const v = (y / size) * n
      const over = (Math.floor(u) + Math.floor(v)) % 4 < 2
      const fu = u - Math.floor(u)
      const fv = v - Math.floor(v)
      // slope of the thread on top gives the normal
      const nx = over ? Math.cos(Math.PI * fu) * 0.55 : 0
      const ny = over ? 0 : Math.cos(Math.PI * fv) * 0.55
      const l = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = ((nx / l) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const t = new THREE.DataTexture(data, size, size)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(26, 26)
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

function gridGeometry() {
  const g = new THREE.BufferGeometry()
  const n = GRID * GRID
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  const uv = new Float32Array(n * 2)
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      uv[(j * GRID + i) * 2] = i / (GRID - 1)
      uv[(j * GRID + i) * 2 + 1] = j / (GRID - 1)
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  const idx = []
  for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      const a = j * GRID + i
      idx.push(a, a + GRID, a + 1, a + 1, a + GRID, a + GRID + 1)
    }
  }
  g.setIndex(idx)
  return g
}

export class VeilCtl {
  constructor() {
    this.cloth = new Cloth({ center: [BOWL_SLOT[0], 0, BOWL_SLOT[2]], yaw: 0.35 })
    for (let i = 0; i < 260; i++) this.cloth.step(1 / 120, 8) // drape before the first frame
    this.geometry = gridGeometry()
    this.geometry.attributes.position.array.set(this.cloth.pos)
    this.geometry.computeVertexNormals()
    this.material = new THREE.MeshPhysicalMaterial({
      color: '#1f2744',
      roughness: 0.58,
      sheen: 0.7,
      sheenColor: new THREE.Color('#4f5f9e'),
      sheenRoughness: 0.4,
      normalMap: twill(),
      normalScale: new THREE.Vector2(0.22, 0.22),
      side: THREE.DoubleSide,
      transparent: true,
    })
    this.grabbed = null
    this.auto = null
    this.leaving = false
    this.gone = false
    this.fade = 1
    this.breath = 0
    this.silk = false
    this._move = (e) => this.onMove(e)
    this._up = (e) => this.onUp(e)
    this._key = (e) => this.onKey(e)
  }

  bind({ camera, canvas, mesh }) {
    this.camera = camera
    this.canvas = canvas
    this.mesh = mesh
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
    window.addEventListener('keydown', this._key)
  }

  unbind() {
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
    window.removeEventListener('keydown', this._key)
  }

  ready() {
    return store.get().loaded && store.get().phase === 'veiled' && !this.leaving
  }

  hover(on) {
    if (!this.canvas || this.grabbed) return
    this.canvas.style.cursor = on && this.ready() ? 'grab' : ''
  }

  rustle() {
    if (!this.silk) {
      this.silk = true
      audio.silk()
    }
  }

  onPointerDown(e) {
    if (!this.ready() || this.grabbed) return
    e.stopPropagation()
    e.nativeEvent.__kintsugiHit = true
    audio.unlock()
    const k = this.cloth.nearest(e.point.toArray())
    this.grabbed = { id: e.pointerId, k, plane: facingPlane(this.camera, e.point) }
    this.auto = null
    this.cloth.grab(k, e.point.toArray())
    this.canvas.style.cursor = 'grabbing'
    this.rustle()
  }

  onMove(e) {
    const g = this.grabbed
    if (!g || e.pointerId !== g.id) return
    const p = new THREE.Vector3()
    if (pointOnPlane(e.clientX, e.clientY, this.camera, this.canvas, g.plane, p)) {
      p.y = Math.max(0.004, p.y)
      this.cloth.grab(g.k, p.toArray())
    }
  }

  onUp(e) {
    const g = this.grabbed
    if (!g || e.pointerId !== g.id) return
    this.grabbed = null
    this.cloth.release()
    this.canvas.style.cursor = ''
  }

  onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && this.ready() && !this.auto) {
      e.preventDefault()
      this.reveal()
    }
  }

  /** Pull the corner nearest the camera's right up and away. */
  reveal() {
    if (this.auto || this.leaving) return
    audio.unlock()
    const c = this.cloth
    let k = 0
    let best = -Infinity
    for (let i = 0; i < c.n; i++) {
      const score = c.pos[i * 3] - c.pos[i * 3 + 2] * 0.3 + c.pos[i * 3 + 1] * 0.2
      if (score > best) {
        best = score
        k = i
      }
    }
    this.auto = { k, from: [c.pos[k * 3], c.pos[k * 3 + 1], c.pos[k * 3 + 2]], t: 0 }
  }

  frame(dt) {
    if (this.gone || !this.mesh) return
    const c = this.cloth
    const loaded = store.get().loaded
    // idle: once ready, a corner stirs as if a draught lifted it
    if (loaded && !this.grabbed && !this.auto) {
      this.breath += dt
      if (this.breath > 2.6) {
        this.breath = 0
        const k = GRID * GRID - 1
        c.prev[k * 3 + 1] -= 0.0025
      }
    }
    if (this.auto) {
      const a = this.auto
      a.t += dt
      const t = Math.min(1, a.t / 1.1)
      const e = t * t * (3 - 2 * t)
      const [x, y, z] = a.from
      c.grab(a.k, [x + e * 0.34, y + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.12 + e * 0.05, z + e * 0.05])
      this.rustle()
      if (t >= 1) c.release()
    }
    const sub = 2
    const h = Math.min(dt, 1 / 30) / sub
    for (let i = 0; i < sub; i++) c.step(h, 8)
    const pos = this.geometry.attributes.position
    pos.array.set(c.pos)
    pos.needsUpdate = true
    this.geometry.computeVertexNormals()

    // revealed: once the mouth of the bowl is clear, the silk fades away
    if (!this.leaving && loaded && c.coverage() < 0.12) {
      this.leaving = true
      c.release()
      dispatch({ type: 'UNVEIL' })
      announce('The cloth is off. Hold the bowl.')
    }
    if (this.leaving) {
      this.fade = Math.max(0, this.fade - dt / 0.9)
      this.material.opacity = this.fade
      if (this.fade <= 0) {
        this.gone = true
        this.mesh.visible = false
      }
    }
  }
}
