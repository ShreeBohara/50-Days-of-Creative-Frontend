/* shaders.js — every GLSL string in the project. Deliberately DOM-free
 * so node tests can import it and assert the effect registry lines up
 * with real shader sources.
 *
 * Coordinate conventions (important — everything else follows from these):
 *   - The quad's a_position is in [0,1]^2, NOT clip space. The vertex
 *     shader places it with u_rect = (x, y, w, h) in clip space, so one
 *     shared buffer serves all six planes.
 *   - v_uv.y grows DOWNWARD (v_uv = (x, 1-y)), matching DOM and mouse
 *     coordinates. "Below the cursor" is simply uv.y > u_mouse.y.
 *   - Effects distort in plane-UV space; the final texture lookup goes
 *     through cover(), which applies the CSS background-size:cover crop
 *     computed on the CPU (u_uvScale / u_uvOffset).
 */

export const VERTEX_SHADER = `
attribute vec2 a_position;   // unit quad corner, (0,0)..(1,1)
uniform vec4 u_rect;         // plane rect in clip space: x, y, w, h

varying vec2 v_uv;           // plane-local UV, y pointing down like the DOM

void main() {
  v_uv = vec2(a_position.x, 1.0 - a_position.y);
  gl_Position = vec4(u_rect.xy + a_position * u_rect.zw, 0.0, 1.0);
}
`;

/* Shared fragment prelude: precision, the full uniform set (unused ones
 * are optimized away per program — their locations come back null and
 * the renderer's unconditional uniform writes become harmless no-ops),
 * and the cover() crop helper. */
const PRELUDE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;

uniform sampler2D u_texture;
uniform vec2  u_uvScale;     // cover-crop scale
uniform vec2  u_uvOffset;    // cover-crop offset
uniform float u_ratio;       // plane width / height, for circular distances
uniform vec2  u_mouse;       // cursor in plane-local UV
uniform float u_hover;       // 0..1, eased on enter/leave
uniform float u_sinceEnter;  // seconds since the cursor entered this plane
uniform float u_time;        // gallery clock, seconds
uniform float u_velocity;    // smoothed cursor speed, 0..1
uniform float u_invert;      // pixelate: 1.0 flips the focus field

vec2 cover(vec2 uv) {
  return u_uvOffset + uv * u_uvScale;
}
`;

/* ------------------------------------------------------------------ */

const PASSTHROUGH = PRELUDE + `
/* Passthrough: no distortion — just the cover-cropped photograph,
 * with a whisper of brightness on hover so the uniform plumbing is
 * visible before any real effect exists. Also the reference for what
 * "settled" looks like. */
void main() {
  vec3 color = texture2D(u_texture, cover(v_uv)).rgb;
  color *= 1.0 + 0.06 * u_hover;
  gl_FragColor = vec4(color, 1.0);
}
`;

/* Inline hash-based value noise — no textures, no libraries. Shared by
 * the shaders that want organic variation (flow, melt).
 *   hash: sin-dot fract scrambler, the classic one-liner
 *   noise: bilinear interpolation of hashed lattice corners with a
 *          smoothstep fade — cheap, smooth, good enough at our scales */
const NOISE_GLSL = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;

/* ------------------------------------------------------------------ */

const RIPPLE = PRELUDE + `
/* RIPPLE — concentric sine rings radiating from the cursor.
 *
 * Recipe:
 *   1. distance from the cursor, aspect-corrected so rings stay
 *      circular on non-square planes
 *   2. a sine wave over that distance, phase-driven by time, gives
 *      the ring pattern
 *   3. amplitude = hover gate x entry envelope x spatial falloff.
 *      The envelope decays with time-since-entry (the splash calms
 *      down) but cursor velocity re-excites it, so stirring the
 *      pointer keeps the water moving.
 *   4. displace the sample UV along the cursor->texel direction and
 *      brighten wave crests slightly for a liquid read.
 */
void main() {
  vec2 uv = v_uv;
  vec2 toTexel = (uv - u_mouse) * vec2(u_ratio, 1.0);
  float dist = length(toTexel);
  vec2 dir = normalize(toTexel + 1e-6);

  float envelope = min(1.0, exp(-u_sinceEnter * 0.8) + u_velocity * 0.8);
  float amp = u_hover
            * envelope
            * exp(-dist * 4.0);

  float wave = sin(dist * 42.0 - u_time * 5.5);
  uv += dir * wave * 0.025 * amp;

  vec3 color = texture2D(u_texture, cover(uv)).rgb;
  color *= 1.0 + wave * amp * 0.35; // crest highlight
  gl_FragColor = vec4(color, 1.0);
}
`;

const FLOW_RGB = PRELUDE + NOISE_GLSL + `
/* FLOW RGB — noise-driven UV drift toward the cursor with the three
 * color channels sampled at separated offsets (chromatic smear).
 *
 * Recipe:
 *   1. dir points from this texel toward the cursor — the drift axis
 *   2. animated value noise turns the straight drift into a wandering
 *      current (centered on 0 so the image doesn't slide overall)
 *   3. R and B sample slightly ahead of / behind G along the drift
 *      axis; the spread widens with cursor velocity, so a fast swipe
 *      tears the channels apart and a still cursor almost refocuses.
 */
void main() {
  vec2 uv = v_uv;
  vec2 dir = normalize(u_mouse - uv + 1e-6);

  float n = noise(uv * 6.0 + u_time * 0.4);
  vec2 flow = dir * (n - 0.5) * 0.09 * u_hover;

  float spread = (0.004 + 0.028 * u_velocity) * u_hover;

  float r = texture2D(u_texture, cover(uv + flow + dir * spread)).r;
  float g = texture2D(u_texture, cover(uv + flow)).g;
  float b = texture2D(u_texture, cover(uv + flow - dir * spread)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

const PIXELATE = PRELUDE + `
/* PIXELATE — the image collapses into mosaic cells near the cursor.
 *
 * Recipe:
 *   1. focus = 1 at the cursor, fading out half a plane away
 *      (aspect-corrected distance). u_invert flips the field so the
 *      EDGES pixelate and the cursor carries a window of clarity.
 *   2. the cell grid is FIXED per frame (velocity sets its density:
 *      fast cursor = chunkier mosaic). It must not vary per texel —
 *      a spatially-varying cell count makes neighboring texels snap
 *      to different lattices and the blocks dissolve into mush.
 *   3. cursor weighting comes from BLENDING the sharp sample toward
 *      the block-center sample by focus x hover, with a smoothstep
 *      to keep the crossfade zone tight.
 *   Cells are aspect-corrected so they stay square on screen.
 */
void main() {
  vec2 aspect = vec2(u_ratio, 1.0);
  float dist = distance(v_uv * aspect, u_mouse * aspect);

  /* NB: smoothstep edges must be ascending — reversed edges are
   * undefined behavior in GLSL (and really do return 0 on some
   * drivers), so fall-off fields are written as 1.0 - smoothstep. */
  float focus = 1.0 - smoothstep(0.05, 0.55, dist);
  focus = mix(focus, 1.0 - focus, u_invert);
  float amount = focus * u_hover;

  float cells = mix(56.0, 14.0, min(u_velocity, 1.0));
  vec2 grid = vec2(cells * u_ratio, cells);
  vec2 snapped = (floor(v_uv * grid) + 0.5) / grid;

  vec3 sharp  = texture2D(u_texture, cover(v_uv)).rgb;
  vec3 mosaic = texture2D(u_texture, cover(snapped)).rgb;

  gl_FragColor = vec4(mix(sharp, mosaic, smoothstep(0.1, 0.7, amount)), 1.0);
}
`;

const MELT = PRELUDE + NOISE_GLSL + `
/* MELT — everything below the cursor drips downward like wet paint.
 *
 * Recipe:
 *   1. "below" ramps 0 -> 1 over a band under the cursor row
 *      (v_uv.y grows downward, so below the cursor is uv.y > mouse.y)
 *   2. each column drips at its own noise-chosen rate, animated
 *      slowly so the drips wander
 *   3. the actual melt: COMPRESS the sample UV back toward the cursor
 *      row. Sampling higher up stretches those rows over the space
 *      below — the paint pulls down. Velocity feeds the stretch.
 *   4. a slight noise wobble in x bends the drips; a touch of
 *      darkening at full stretch reads as wet sheen.
 */
void main() {
  vec2 uv = v_uv;

  float below = smoothstep(0.0, 0.35, uv.y - u_mouse.y);
  float drip = noise(vec2(uv.x * 24.0, u_time * 0.7));
  float stretch = below * u_hover
                * (0.15 + 0.5 * u_velocity)
                * (0.6 + 0.8 * drip);

  uv.y = u_mouse.y + (uv.y - u_mouse.y) / (1.0 + stretch * 3.0);
  uv.x += (drip - 0.5) * 0.02 * below * u_hover;

  vec3 color = texture2D(u_texture, cover(uv)).rgb;
  color *= 1.0 - 0.18 * min(stretch, 1.0); // wet sheen
  gl_FragColor = vec4(color, 1.0);
}
`;

export const FRAGMENTS = {
  passthrough: PASSTHROUGH,
  ripple: RIPPLE,
  "flow-rgb": FLOW_RGB,
  pixelate: PIXELATE,
  melt: MELT,
};
