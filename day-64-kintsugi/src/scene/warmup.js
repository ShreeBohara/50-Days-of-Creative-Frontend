// Shader warm-up. three compiles a program the first time a material is drawn,
// and on a first draw mid-ritual that is a visible freeze (the crack race,
// the first shard, lacquer appearing, the first gold flake). So before the
// silk can be pulled off, every program the ritual will ever need is compiled
// up front — through KHR_parallel_shader_compile where the browser has it, so
// the main thread keeps drawing the veil meanwhile.

import * as THREE from 'three'
import { buildRibbonGeometry, makeSeamState } from './ribbons.js'
import { makeCrackMaterial, makeFlakeMaterial, makeFracture, makeGhostMaterial, makeSeamMaterial } from './materials.js'

// One tiny fake seam: enough attributes for the ribbon programs.
function fakeSeam() {
  const n = 3
  return {
    n,
    pos: new Float32Array([0, 0, 0, 0.001, 0, 0, 0.002, 0, 0]),
    nrm: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]),
    arclen: new Float32Array([0, 0.001, 0.002]),
    impactDist: new Float32Array([0, 0.001, 0.002]),
    length: 0.002,
  }
}

// Disposing a material also releases its program once unused, which would undo
// the warm-up — so the stand-ins live for the page (a handful of tiny objects).
const keepAlive = []

/**
 * Stand-ins for every material that first appears after the veil lifts. Only
 * the first run builds them: their programs stay alive (keepAlive) for the
 * page, so 'begin again' needs none — and must not pile up more.
 */
export function extrasFor(ceramic) {
  if (keepAlive.length) return null
  const dustMaterial = makeFlakeMaterial()
  const ghostMaterial = makeGhostMaterial()
  const group = new THREE.Group()
  const box = new THREE.BoxGeometry(0.001, 0.001, 0.001)
  // a shard: glaze + clay groups, casting and receiving shadow like the real ones
  const shardGeo = box.clone()
  shardGeo.clearGroups()
  shardGeo.addGroup(0, 18, 0)
  shardGeo.addGroup(18, 18, 1)
  const fracture = makeFracture()
  const glaze = ceramic ?? new THREE.MeshPhysicalMaterial()
  const shard = new THREE.Mesh(shardGeo, [glaze, fracture])
  shard.castShadow = shard.receiveShadow = true
  const ribbon = buildRibbonGeometry([fakeSeam()])
  const { tex } = makeSeamState(1)
  const seamMat = makeSeamMaterial(tex, 1)
  const crackMat = makeCrackMaterial()
  const seam = new THREE.Mesh(ribbon, seamMat)
  const crack = new THREE.Mesh(ribbon, crackMat)
  group.add(shard, seam, crack)
  if (dustMaterial) {
    const dust = new THREE.InstancedMesh(box, dustMaterial, 1)
    group.add(dust)
  }
  if (ghostMaterial) group.add(new THREE.Mesh(box, ghostMaterial))
  group.traverse((o) => {
    o.frustumCulled = false
  })
  keepAlive.push(fracture, seamMat, crackMat, dustMaterial, ghostMaterial, glaze, tex)
  const dispose = () => {
    box.dispose()
    shardGeo.dispose()
    ribbon.dispose()
  }
  return { group, dispose }
}

// a frame, or 50 ms in a background tab where rAF is paused
const nextFrame = () =>
  new Promise((r) => {
    const t = setTimeout(r, 50)
    requestAnimationFrame(() => {
      clearTimeout(t)
      r()
    })
  })

// Every texture the scene will sample, so each can be decoded and uploaded on
// its own frame instead of all six 2048² maps landing on one.
function sceneTextures(scene) {
  const out = new Set()
  scene.traverse((o) => {
    if (o.isLight && o.map?.isTexture) out.add(o.map)
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      for (const v of Object.values(m)) if (v?.isTexture && !v.isRenderTargetTexture) out.add(v)
    }
  })
  return [...out]
}

/**
 * Compile the whole scene plus the extras. Resolves when every program is
 * linked (or immediately-ish where parallel compile isn't available).
 */
export async function warmUp(gl, scene, camera, extras) {
  const t0 = performance.now()
  // bounds trees for the heavy, rigid meshes the pointer tests (the silk
  // deforms every frame, so it keeps the plain raycast)
  scene.traverse((o) => {
    const g = o.isMesh && !o.isInstancedMesh ? o.geometry : null
    if (!g || g.boundsTree || !g.computeBoundsTree) return
    const pos = g.attributes.position
    if (pos && pos.count > 2000 && pos.usage === THREE.StaticDrawUsage) g.computeBoundsTree()
  })
  // one upload per frame while the silk is still at rest
  for (const tex of sceneTextures(scene)) {
    gl.initTexture(tex)
    await nextFrame()
  }
  if (extras) scene.add(extras.group)
  // The composer draws the scene into its own linear half-float target, and
  // three keys each program on the colour space of the bound target — with
  // nothing bound, compile() would build sRGB-output variants no frame uses.
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType })
  const prev = gl.getRenderTarget()
  try {
    gl.setRenderTarget(target)
    const ready = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera))
    gl.setRenderTarget(prev)
    await ready
    // One real (tiny) draw: allocates buffers and the shadow-depth programs a
    // compile pass doesn't reach, while nothing is on screen to hitch.
    gl.setRenderTarget(target)
    gl.shadowMap.needsUpdate = true // the shadow pass is on demand (ShadowGate)
    gl.render(scene, camera)
  } catch (err) {
    console.warn('shader warm-up skipped', err)
  } finally {
    gl.setRenderTarget(prev)
    target.dispose()
  }
  if (extras) {
    scene.remove(extras.group)
    extras.dispose()
  }
  return performance.now() - t0
}
