/* ------------------------------------------------------------------ math */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (x) => {
  x = clamp01(x)
  return x * x * (3 - 2 * x)
}

/**
 * Build a Fraunces font-variation-settings string.
 * Axes: opsz 9–144 · wght 100–900 · SOFT 0–100 · WONK 0–1
 */
export const fvs = ({ opsz = 144, wght = 360, SOFT = 0, WONK = 0 } = {}) =>
  `"opsz" ${opsz.toFixed(1)}, "wght" ${wght.toFixed(1)}, ` +
  `"SOFT" ${SOFT.toFixed(1)}, "WONK" ${WONK.toFixed(2)}`

/**
 * Each behavior owns its per-frame writing to the glyph node so it can choose
 * its own smoothing character (fluid vs. jittery). `step(g, ctx)` mutates the
 * glyph's smoothing state and writes inline styles.
 *
 * ctx = { px, py, active, t, dt, radius, intensity, baseWeight, w, h, count }
 */

// Magnet — glyphs nearest the cursor gain weight, optical size and softness.
const magnet = {
  id: 'magnet',
  label: 'Magnet',
  hint: 'Glyphs swell toward the cursor',
  step(g, ctx) {
    const dist = Math.hypot(ctx.px - g.cx, ctx.py - g.cy)
    const infl = smoothstep(1 - dist / ctx.radius) * ctx.intensity

    const tw = lerp(ctx.baseWeight, 900, infl)
    const to = lerp(26, 144, infl)
    const ts = lerp(0, 85, infl)
    const tscale = 1 + infl * 0.16
    const tty = -infl * 7

    const e = 0.2
    g.wght = lerp(g.wght, tw, e)
    g.opsz = lerp(g.opsz, to, e)
    g.soft = lerp(g.soft, ts, e)
    g.scale = lerp(g.scale, tscale, e)
    g.ty = lerp(g.ty, tty, e)

    g.node.style.fontVariationSettings = fvs({
      opsz: g.opsz,
      wght: g.wght,
      SOFT: g.soft,
    })
    g.node.style.transform = `translate3d(0, ${g.ty.toFixed(2)}px, 0) scale(${g.scale.toFixed(3)})`
    g.node.style.opacity = '1'
  },
}

export const BEHAVIORS = [magnet]

export const getBehavior = (id) =>
  BEHAVIORS.find((b) => b.id === id) || BEHAVIORS[0]
