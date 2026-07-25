/* renderer.js — owns plane state and the per-frame draw. One tick()
 * serves both the real rAF loop and the manual gallery.step() used for
 * headless QA (hidden tabs never fire rAF), so time comes from an
 * accumulator fed with dt — never performance.now() directly.
 */

import { buildProgram, createQuad, createTextureFrom, resizeToDisplay } from "./glCore.js";
import { VERTEX_SHADER, FRAGMENTS } from "./shaders.js";
import { rectToClip, viewportRect, coverUV, inflateRect } from "./rectLogic.js";

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
    /* document-space rect in CSS px — stable across scroll, so layout
     * is read only when it can actually change (init/resize/fonts) */
    docRect: null,
    /* viewport-space rect, derived fresh every tick from docRect */
    viewRect: null,
  }));

  let time = 0; // seconds
  let timeScale = 1; // reduced-motion freezes the ambient clock
  let updater = null; // interactions hook, runs between rect sync and draw
  let expand = null; // { index, rect, openness } while a plane is expanding

  /* cross-plane uniform values (cursor speed is global by nature).
   * breathe gates the idle scale sine (reduced-motion turns it off) */
  const globals = { velocity: 0, invert: 0, breathe: true };

  function measure() {
    const sx = window.scrollX;
    const sy = window.scrollY;
    for (const p of planes) {
      const r = p.el.getBoundingClientRect();
      p.docRect = { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height };
    }
  }

  /* refresh viewport rects from the document-space cache — runs every
   * tick even when the canvas can't paint (zero-size hidden tab), so
   * hover hit-testing never goes stale */
  let lastDocW = 0;
  let lastDocH = 0;

  function syncRects() {
    /* self-healing: any layout-size change (resize events can be
     * unreliable in embedded panes; scrollbars and font loads reflow
     * without one) invalidates the document-space cache */
    const docW = document.documentElement.clientWidth;
    const docH = document.documentElement.clientHeight;
    if (docW !== lastDocW || docH !== lastDocH) {
      lastDocW = docW;
      lastDocH = docH;
      if (docW && docH) measure();
    }

    const sx = window.scrollX;
    const sy = window.scrollY;
    for (const p of planes) {
      if (p.docRect) p.viewRect = viewportRect(p.docRect, sx, sy);
    }
  }

  function draw() {
    if (!resizeToDisplay(gl, canvas)) return;
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* clientWidth falls back to layout width: hidden preview panes
     * report 0 for the fixed canvas while the document still lays out */
    const vw = canvas.clientWidth || document.documentElement.clientWidth;
    const vh = canvas.clientHeight || document.documentElement.clientHeight;
    const prog = programs[activeEffect];
    gl.useProgram(prog.program);

    function drawPlane(p, rect, hoverScale) {
      if (!rect || !rect.w || !rect.h) return;

      const clip = rectToClip(rect, vw, vh);
      const crop = coverUV(rect.w, rect.h);

      gl.uniform4f(prog.u.u_rect, clip.x, clip.y, clip.w, clip.h);
      gl.uniform2f(prog.u.u_uvScale, crop.scale[0], crop.scale[1]);
      gl.uniform2f(prog.u.u_uvOffset, crop.offset[0], crop.offset[1]);
      gl.uniform1f(prog.u.u_ratio, rect.w / rect.h);
      gl.uniform1f(prog.u.u_time, time);
      gl.uniform2f(prog.u.u_mouse, p.uMouse?.u ?? 0.5, p.uMouse?.v ?? 0.5);
      gl.uniform1f(prog.u.u_hover, (p.uHover ?? 0) * hoverScale);
      gl.uniform1f(prog.u.u_sinceEnter, p.uSinceEnter ?? 0);
      gl.uniform1f(prog.u.u_velocity, globals.velocity);
      gl.uniform1f(prog.u.u_invert, globals.invert);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.texture);
      gl.uniform1i(prog.u.u_texture, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    for (const p of planes) {
      if (expand && expand.index === p.index) continue; // drawn last
      /* idle breathing: ±2% scale on a slow sine, phase-offset per
       * plane so the grid never pulses in lockstep */
      let rect = p.viewRect;
      if (globals.breathe && rect) {
        rect = inflateRect(rect, 1 + 0.02 * Math.sin(0.8 * time + p.index * 1.7));
      }
      drawPlane(p, rect, 1);
    }

    /* the expanding plane rides on top with its distortion settling
     * toward zero as it approaches fullscreen */
    if (expand) {
      const p = planes[expand.index];
      drawPlane(p, expand.rect, 1 - expand.openness);
    }
  }

  function tick(dtMs) {
    const dtSec = dtMs / 1000;
    time += dtSec * timeScale;
    syncRects();
    if (updater) updater(dtSec);
    draw();
  }

  return {
    planes,
    globals,
    measure,
    tick,
    draw,
    setUpdater(fn) { updater = fn; },
    setExpand(v) { expand = v; },
    setTimeScale(s) { timeScale = s; },
    setEffect(name) {
      if (programs[name]) activeEffect = name;
    },
    get effect() { return activeEffect; },
    get time() { return time; },
  };
}
