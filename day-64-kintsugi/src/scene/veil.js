// The loader is the scene: an indigo fukusa lies over the bowl while the
// models stream in. Once everything is ready its corner stirs; grab the silk
// anywhere and pull it off (Enter does it for you). It's live Verlet cloth, so
// it drapes, drags and slides like fabric.

import * as THREE from 'three'
import { Cloth, GRID, TICK } from './cloth.js'
import { BOWL_SLOT } from './geometry.js'
import { audio } from '../audio/engine.js'
import { announce, dispatch, rt, store } from '../state/store.js'
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

// The key light's shadow of the silk thins with it while it fades (a shadow
// map ignores opacity): a stable per-pixel dither against the fade.
function fadingDepth(fade) {
  const m = new THREE.MeshDepthMaterial()
  m.onBeforeCompile = (shader) => {
    shader.uniforms.veilFade = fade
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `uniform float veilFade;
void main() {
  if (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) >= veilFade) discard;`,
    )
  }
  m.customProgramCacheKey = () => 'veil-fade'
  return m
}

const CORNER = GRID * GRID - 1 // the one that stirs
const BREATH_LIFT = 0.2 // m/s: the draught's nudge to that corner
const _p = new THREE.Vector3()

function gridGeometry() {
  const g = new THREE.BufferGeometry()
  const n = GRID * GRID
  // rewritten every frame: a dynamic buffer (and never given a static BVH for raycasts)
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
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
    this.cloth = Cloth.draped({ center: [BOWL_SLOT[0], 0, BOWL_SLOT[2]], yaw: 0.35 }) // draped before the first frame
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
    this.fadeU = { value: 1 }
    this.depthMaterial = fadingDepth(this.fadeU)
    this.grabbed = null
    this.auto = null
    this.leaving = false
    this.gone = false // fully faded: nothing left to draw or simulate
    this.onGone = null
    this.fade = 1
    this.breath = 0
    this.silk = false
    this.target = [0, 0, 0] // the pinned particle's goal, reused (grab keeps a reference)
    this._move = (e) => this.onMove(e)
    this._up = (e) => this.onUp(e)
    this._key = (e) => this.onKey(e)
    this._blur = () => this.letGo()
    this._lost = (e) => this.grabbed && e.pointerId === this.grabbed.id && this.letGo()
    this._tick = (h) => this.tick(h)
  }

  bind({ camera, canvas, mesh, onGone = null }) {
    this.camera = camera
    this.canvas = canvas
    this.mesh = mesh
    this.onGone = onGone
    if (this.gone) return
    window.addEventListener('pointermove', this._move)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
    window.addEventListener('keydown', this._key)
    window.addEventListener('blur', this._blur)
    canvas.addEventListener('lostpointercapture', this._lost)
  }

  unbind() {
    window.removeEventListener('pointermove', this._move)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
    window.removeEventListener('keydown', this._key)
    window.removeEventListener('blur', this._blur)
    this.canvas?.removeEventListener('lostpointercapture', this._lost)
  }

  ready() {
    return store.get().loaded && store.get().phase === 'veiled' && !this.leaving
  }

  hover(on) {
    // a leaving silk no longer owns the cursor (the bowl beneath it does)
    if (!this.canvas || this.grabbed || this.leaving || rt.craft?.tool) return
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
    this.cloth.grab(k, e.point.toArray(this.target))
    // keep the pull even when the pointer leaves the canvas or crosses the UI
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // not an active pointer (synthetic event): window listeners still work
    }
    this.canvas.style.cursor = 'grabbing'
    this.rustle()
  }

  onMove(e) {
    const g = this.grabbed
    if (!g || e.pointerId !== g.id) return
    if (pointOnPlane(e.clientX, e.clientY, this.camera, this.canvas, g.plane, _p)) {
      _p.y = Math.max(0.004, _p.y)
      this.cloth.grab(g.k, _p.toArray(this.target))
    }
  }

  onUp(e) {
    const g = this.grabbed
    if (!g || e.pointerId !== g.id) return
    this.letGo()
  }

  /** Drop the silk wherever it is: pointerup, a lost capture, or the window losing focus. */
  letGo() {
    const g = this.grabbed
    if (!g) return
    this.grabbed = null
    this.cloth.release()
    this.canvas.style.cursor = ''
    try {
      if (this.canvas.hasPointerCapture?.(g.id)) this.canvas.releasePointerCapture(g.id)
    } catch {
      // already released
    }
  }

  onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && this.ready() && !this.auto) {
      e.preventDefault()
      this.reveal()
    }
  }

  /** Pull the corner nearest the camera's right up and away. */
  reveal() {
    if (this.auto || !this.ready()) return
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

  /** Per fixed tick: the auto pull moves on simulation time, so it's the same at any frame rate. */
  tick(h) {
    const a = this.auto
    if (!a) return
    // draw the corner up and away, and keep hold until the mouth is clear
    const c = this.cloth
    a.t += h
    const t = Math.min(1, a.t / 1.1)
    const e = t * t * (3 - 2 * t)
    const [x, y, z] = a.from
    const p = this.target
    p[0] = x + e * 0.42
    p[1] = y + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.12 + e * 0.06
    p[2] = z + e * 0.08
    c.grab(a.k, p)
    if ((t >= 1 && c.coverage() < 0.12) || a.t > 3) {
      c.release()
      this.auto = null
    }
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
        c.prev[CORNER * 3 + 1] -= BREATH_LIFT * TICK
      }
    }
    if (this.auto) this.rustle()
    // fixed 1/120 s ticks, the same resting or pulled: no pop when a grab starts
    const ticks = c.advance(dt, this._tick)
    // draw between the last two ticks (a 144 Hz frame often has none)
    const g = this.geometry
    c.lerpInto(g.attributes.position.array)
    g.attributes.position.needsUpdate = true
    g.computeVertexNormals()
    // raycasts test the bounding sphere first: keep it around where the silk now lies
    if (ticks > 0) g.computeBoundingSphere()

    // revealed: once the mouth of the bowl is clear, the silk fades away
    // (a hand or the auto pull keeps hold of it while it fades; its shadow fades with it)
    if (ticks > 0 && !this.leaving && loaded && c.coverage() < 0.12) {
      this.leaving = true
      dispatch({ type: 'UNVEIL' })
      announce('The cloth is off. Hold the bowl.')
    }
    if (this.leaving) {
      this.fade = Math.max(0, this.fade - dt / 0.9)
      this.material.opacity = this.fade
      this.fadeU.value = this.fade
      if (this.fade <= 0) {
        this.letGo()
        this.gone = true
        this.mesh.visible = false
        this.mesh.castShadow = false
        this.unbind()
        this.onGone?.() // Veil unmounts the mesh and its frame callback: no more work at all
      }
    }
  }
}
