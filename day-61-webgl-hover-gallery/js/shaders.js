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

export const FRAGMENTS = {
  passthrough: PASSTHROUGH,
  ripple: RIPPLE,
};
