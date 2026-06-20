/* ------------------------------------------------------------------ math */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x)
export const lerp = (a, b, t) => a + (b - a) * t
const TAU = Math.PI * 2
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
  g.enter = null
  g.node.style.textShadow = 'none'
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

// Ripple — concentric weight waves radiate outward from the cursor over time.
const ripple = {
  id: 'ripple',
  label: 'Ripple',
  hint: 'Weight waves pulse out from the cursor',
  reset: resetGlyph,
  step(g, ctx) {
    const dist = Math.hypot(g.cx - ctx.px, g.cy - ctx.py)
    const wavelength = 230
    const speed = 360
    const phase = ((dist - ctx.t * speed) / wavelength) * TAU
    const crest = Math.max(0, Math.cos(phase))
    const atten = Math.max(0, 1 - dist / (ctx.radius * 2.4))
    const target = crest * crest * atten * ctx.intensity

    g.scale = lerp(g.scale, 1, 0.3) // (unused channel kept neutral)
    const infl = target
    const wght = lerp(ctx.baseWeight, 880, infl)
    g.node.style.fontVariationSettings = fvs({
      opsz: lerp(48, 144, infl),
      wght,
      SOFT: infl * 70,
    })
    g.node.style.transform =
      `translate3d(0, ${(-infl * 9).toFixed(2)}px, 0) scale(${(1 + infl * 0.2).toFixed(3)})`
    g.node.style.opacity = '1'
  },
}

// Glitch — letters near the cursor jitter, flicker weight and split into
// chromatic-aberration ghosts.
const glitch = {
  id: 'glitch',
  label: 'Glitch',
  hint: 'Letters tear and split near the cursor',
  reset: resetGlyph,
  step(g, ctx) {
    const dist = Math.hypot(g.cx - ctx.px, g.cy - ctx.py)
    const j = smoothstep(1 - dist / ctx.radius) * ctx.intensity

    const rx = (Math.random() * 2 - 1) * 6 * j
    const ry = (Math.random() * 2 - 1) * 6 * j
    const sk = (Math.random() * 2 - 1) * 9 * j
    const wght = clamp(
      lerp(ctx.baseWeight, 860, j) + (Math.random() * 2 - 1) * 140 * j,
      100,
      900,
    )

    g.node.style.fontVariationSettings = fvs({
      opsz: lerp(40, 144, j),
      wght,
      SOFT: j * 40,
    })
    g.node.style.transform =
      `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0) ` +
      `skewX(${sk.toFixed(1)}deg) scale(${(1 + 0.1 * j).toFixed(3)})`

    if (j > 0.08) {
      const o = 2.6 * j
      g.node.style.textShadow =
        `${o.toFixed(1)}px 0 rgba(255,61,0,0.9), ` +
        `${(-o).toFixed(1)}px 0 rgba(27,43,232,0.9)`
    } else {
      g.node.style.textShadow = 'none'
    }
    g.node.style.opacity = '1'
  },
}

// Spotlight — a pool of focus follows the cursor; everything else fades to a
// faint hairline.
const spotlight = {
  id: 'spotlight',
  label: 'Spotlight',
  hint: 'A focus pool follows the cursor',
  reset: resetGlyph,
  step(g, ctx) {
    const dist = Math.hypot(g.cx - ctx.px, g.cy - ctx.py)
    const infl = smoothstep(1 - dist / (ctx.radius * 0.85))

    const wght = lerp(150, lerp(640, 860, ctx.intensity - 0.5), infl)
    const opsz = lerp(16, 144, infl)
    const op = lerp(0.1, 1, infl)
    const scale = 1 + infl * 0.07

    const e = 0.22
    g.wght = lerp(g.wght, wght, e)
    g.opsz = lerp(g.opsz, opsz, e)
    g.opacity = lerp(g.opacity, op, e)
    g.scale = lerp(g.scale, scale, e)

    g.node.style.fontVariationSettings = fvs({
      opsz: g.opsz,
      wght: g.wght,
      SOFT: infl * 60,
    })
    g.node.style.transform = `scale(${g.scale.toFixed(3)})`
    g.node.style.opacity = g.opacity.toFixed(3)
  },
}

// Stagger — letters reveal one-by-one on entry, then breathe gently; the cursor
// adds a soft local emphasis.
const stagger = {
  id: 'stagger',
  label: 'Reveal',
  hint: 'Letters reveal in sequence, then breathe',
  reset: resetGlyph,
  step(g, ctx) {
    if (g.enter == null) g.enter = ctx.t
    const local = ctx.t - g.enter
    const delay = g.index * 0.05
    const p = smoothstep(clamp01((local - delay) / 0.7))

    const dist = Math.hypot(g.cx - ctx.px, g.cy - ctx.py)
    const near = smoothstep(1 - dist / ctx.radius) * ctx.intensity
    const breathe = (Math.sin(ctx.t * 1.1 + g.index * 0.4) * 0.5 + 0.5) * 0.35

    const settled = lerp(lerp(320, 470, breathe), 840, near)
    const wght = lerp(190, settled, p)
    const opsz = lerp(28, lerp(72, 144, near), p)
    const ty = lerp(36, -near * 6, p)
    const scale = lerp(0.95, 1 + near * 0.09, p)

    g.node.style.fontVariationSettings = fvs({ opsz, wght, SOFT: near * 50 })
    g.node.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`
    g.node.style.opacity = p.toFixed(3)
  },
}

export const BEHAVIORS = [magnet, gravity, ripple, glitch, spotlight, stagger]

export const getBehavior = (id) =>
  BEHAVIORS.find((b) => b.id === id) || BEHAVIORS[0]
