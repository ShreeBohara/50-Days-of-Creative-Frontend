// Compile every shader program the book will ever need before the reader can
// reach it: the paper, the drawing card's glow, the hover highlighter, the
// x-ray lines and the shadow depth passes. three compiles a program the first
// time something using it is drawn, and a first draw mid page-turn is a
// visible stall. Objects that start hidden opt in with userData.warm.
//
// The composer renders the scene into a half-float target and three keys
// programs on the bound target's colour space, so the compile binds one too —
// with nothing bound it would build variants no frame ever uses.

import * as THREE from 'three'

export async function warmUp(gl, scene, camera) {
  const restore = []
  scene.traverse((o) => {
    if (o.userData.warm || o.name?.startsWith('spread-')) {
      restore.push([o, o.visible])
      o.visible = true
    }
  })
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType })
  const prev = gl.getRenderTarget()
  gl.setRenderTarget(target)
  try {
    if (gl.compileAsync) await gl.compileAsync(scene, camera, scene)
    else gl.compile(scene, camera)
    gl.shadowMap.needsUpdate = true
    gl.render(scene, camera)
  } catch {
    /* a failed warm-up only means a later first draw compiles instead */
  } finally {
    gl.setRenderTarget(prev)
    for (const [o, v] of restore) o.visible = v
    target.dispose()
    gl.shadowMap.needsUpdate = true
  }
  return gl.info.programs?.length ?? 0
}
