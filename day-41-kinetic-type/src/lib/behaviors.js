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

// Zero a glyph's physics/smoothing state — called when a behavior takes over.
const resetGlyph = (g) => {
  g.tx = 0
  g.ty = 0
  g.vx = 0
  g.vy = 0
  g.rot = 0
  g.scale = 1
  g.opacity = 1
}

// Magnet — glyphs nearest the cursor gain weight, optical size and softness.
const magnet = {
  id: 'magnet',
  label: 'Magnet',
  hint: 'Glyphs swell toward the cursor',
  reset: resetGlyph,
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

// Gravity — letters hang under gravity; the cursor knocks them loose and they
// spring back. A damped spring toward the rest line keeps the motion lively.
const gravity = {
  id: 'gravity',
  label: 'Gravity',
  hint: 'Cursor scatters letters; they fall and settle',
  reset: resetGlyph,
  step(g, ctx) {
    const dx = g.cx - ctx.px
    const dy = g.cy - ctx.py
    const dist = Math.hypot(dx, dy) || 1
    const push = Math.max(0, 1 - dist / ctx.radius)

    // Cursor repulsion (outward) + constant downward pull.
    const f = push * push * 1000 * ctx.intensity
    const ax = (dx / dist) * f
    const ay = (dy / dist) * f + 1150

    // Damped spring back to the rest line (0, 0).
    const k = 95
    const damp = 9
    g.vx += (ax - k * g.tx - damp * g.vx) * ctx.dt
    g.vy += (ay - k * g.ty - damp * g.vy) * ctx.dt
    g.tx = Math.max(-220, Math.min(220, g.tx + g.vx * ctx.dt))
    g.ty = Math.max(-200, Math.min(260, g.ty + g.vy * ctx.dt))
    g.rot = lerp(g.rot, Math.max(-20, Math.min(20, g.vx * 0.02)), 0.18)

    const wght = lerp(ctx.baseWeight, 820, push)
    g.node.style.fontVariationSettings = fvs({
      opsz: lerp(42, 144, push),
      wght,
      SOFT: push * 55,
    })
    g.node.style.transform =
      `translate3d(${g.tx.toFixed(2)}px, ${g.ty.toFixed(2)}px, 0) ` +
      `rotate(${g.rot.toFixed(2)}deg)`
    g.node.style.opacity = '1'
  },
}

export const BEHAVIORS = [magnet, gravity]

export const getBehavior = (id) =>
  BEHAVIORS.find((b) => b.id === id) || BEHAVIORS[0]
