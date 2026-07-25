/* renderer.js — owns plane state and the per-frame draw. One tick()
 * serves both the real rAF loop and the manual gallery.step() used for
 * headless QA (hidden tabs never fire rAF), so time comes from an
 * accumulator fed with dt — never performance.now() directly.
 */

import { buildProgram, createQuad, createTextureFrom, resizeToDisplay } from "./glCore.js";
import { VERTEX_SHADER, FRAGMENTS } from "./shaders.js";

export function createRenderer({ gl, canvas, frames, textures }) {
  const programs = {};
  for (const [name, src] of Object.entries(FRAGMENTS)) {
    programs[name] = buildProgram(gl, VERTEX_SHADER, src);
  }
  let activeEffect = "passthrough";

  createQuad(gl);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const planes = textures.map(({ recipe, canvas: texCanvas }, i) => ({
    index: i,
    recipe,
    texture: createTextureFrom(gl, texCanvas),
    el: frames[i],
    /* viewport-space rect in CSS pixels, measured at load for now —
     * scroll/resize sync lands with the dom-sync commit */
    viewRect: null,
  }));

  let time = 0; // seconds

  function measure() {
    for (const p of planes) {
      const r = p.el.getBoundingClientRect();
      p.viewRect = { x: r.left, y: r.top, w: r.width, h: r.height };
    }
  }

  function draw() {
    if (!resizeToDisplay(gl, canvas)) return;
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vw = canvas.clientWidth;
    const vh = canvas.clientHeight;
    const prog = programs[activeEffect];
    gl.useProgram(prog.program);

    for (const p of planes) {
      const r = p.viewRect;
      if (!r || !r.w || !r.h) continue;

      /* CSS-pixel viewport rect -> clip space (y flips, so we hand GL
       * the rect's bottom edge) */
      const cx = (r.x / vw) * 2 - 1;
      const cy = 1 - ((r.y + r.h) / vh) * 2;
      const cw = (r.w / vw) * 2;
      const ch = (r.h / vh) * 2;

      gl.uniform4f(prog.u.u_rect, cx, cy, cw, ch);
      gl.uniform2f(prog.u.u_uvScale, 1, 1);
      gl.uniform2f(prog.u.u_uvOffset, 0, 0);
      gl.uniform1f(prog.u.u_ratio, r.w / r.h);
      gl.uniform1f(prog.u.u_time, time);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.texture);
      gl.uniform1i(prog.u.u_texture, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  function tick(dtMs) {
    time += dtMs / 1000;
    draw();
  }

  return {
    planes,
    measure,
    tick,
    draw,
    setEffect(name) {
      if (programs[name]) activeEffect = name;
    },
    get effect() { return activeEffect; },
    get time() { return time; },
  };
}
