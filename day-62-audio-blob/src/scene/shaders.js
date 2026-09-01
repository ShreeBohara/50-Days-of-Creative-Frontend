// ============================================================
// Blob shaders — the heart of day 62.
//
// The blob is a high-resolution icosphere whose vertices are
// pushed along their normals by three layers of simplex noise,
// one per audio band:
//
//   BASS  → the whole body swells (big, slow, low-frequency)
//   MIDS  → traveling ripples across the surface (medium freq)
//   HIGHS → thin needle spikes (high-octave noise, sharpened)
//
// Uniforms are created once per material and mutated every
// frame — never recreated.
// ============================================================

export function createBlobUniforms() {
  return {
    u_time: { value: 0 },
    // normalized 0..1 band energies — fed by the audio engine
    u_bass: { value: 0 },
    u_mid: { value: 0 },
    u_high: { value: 0 },
    // 0..1 idle-motion scale (reduced-motion support turns it down)
    u_idle: { value: 1 },
  }
}

// ------------------------------------------------------------
// Simplex noise 3D — Ian McEwan, Ashima Arts (webgl-noise),
// MIT license. The one true GPU noise. Returns roughly [-1, 1].
// ------------------------------------------------------------
const simplexNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // first corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // gradients: 7x7 points over a square, mapped onto an octahedron
  float n_ = 0.142857142857; // 1/7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // normalise gradients
  vec4 norm = taylorInvSqrt(
    vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // mix final noise value
  vec4 m = max(
    0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m,
    vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

// ------------------------------------------------------------
// VERTEX — layered displacement along the sphere normal, then a
// numerical normal rebuild (displace two tangent neighbors, cross
// the tangent deltas) so lighting follows the deformed surface.
// ------------------------------------------------------------
export const vertexShader = /* glsl */ `
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_idle;

varying vec3 v_normal;   // world-space rebuilt normal
varying vec3 v_viewDir;  // surface -> camera, world space
varying vec3 v_objPos;   // object-space position (noise domain)
varying float v_disp;    // total displacement, for fragment tinting
varying float v_spike;   // high-band spike amount alone

${simplexNoise}

// How far a unit-sphere point moves along its normal right now.
// Kept in one function because the normal rebuild has to evaluate
// the SAME field at neighboring points.
float displace(vec3 p, float t) {
  // idle breath — tiny and slow, so silence still looks alive
  float breath = u_idle * 0.02 * snoise(p * 1.2 + vec3(0.0, t * 0.18, 0.0));

  // BASS — body swell: a uniform inflate plus one huge slow bulge
  float bass = u_bass * (0.30 + 0.22 * snoise(p * 1.4 + vec3(t * 0.35)));

  // MIDS — medium-frequency ripples drifting across the surface
  float mid = u_mid * 0.26 * snoise(p * 3.6 + vec3(0.0, -t * 0.7, t * 0.45));

  // HIGHS — high-octave noise raised to a power: only the peaks
  // survive, which turns hiss and cymbals into thin needles
  float hn = 0.5 + 0.5 * snoise(p * 7.5 + vec3(t * 1.6, 0.0, -t * 1.1));
  float high = u_high * 0.45 * pow(hn, 5.0);

  return breath + bass + mid + high;
}

// spike-only field, evaluated once for fragment coloring
float spikeField(vec3 p, float t) {
  float hn = 0.5 + 0.5 * snoise(p * 7.5 + vec3(t * 1.6, 0.0, -t * 1.1));
  return u_high * pow(hn, 5.0);
}

// stable tangent for any direction (avoids the pole degeneracy of
// crossing with a fixed up-vector)
vec3 orthogonal(vec3 v) {
  return normalize(abs(v.x) > abs(v.z)
    ? vec3(-v.y, v.x, 0.0)
    : vec3(0.0, -v.z, v.y));
}

void main() {
  // unit icosphere: the position IS the outward normal
  vec3 p = normalize(position);
  float t = u_time;

  float d = displace(p, t);
  vec3 displaced = p * (1.0 + d);

  // rebuild the normal from two displaced tangent neighbors.
  // eps trades accuracy for smoothness — larger softens the shading.
  float eps = 0.06;
  vec3 T = orthogonal(p);
  vec3 B = normalize(cross(p, T)); // (T, B, p) is right-handed
  vec3 pT = normalize(p + T * eps);
  vec3 pB = normalize(p + B * eps);
  vec3 dT = pT * (1.0 + displace(pT, t));
  vec3 dB = pB * (1.0 + displace(pB, t));
  vec3 objNormal = normalize(cross(dT - displaced, dB - displaced));

  vec4 world = modelMatrix * vec4(displaced, 1.0);
  v_objPos = displaced;
  // model matrix is rotation-only here, so mat3 is safe for normals
  v_normal = normalize(mat3(modelMatrix) * objNormal);
  v_viewDir = normalize(cameraPosition - world.xyz);
  v_disp = d;
  v_spike = spikeField(p, t);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`

// ------------------------------------------------------------
// FRAGMENT — placeholder lambert shaded by the rebuilt normal,
// with displacement-based depth so the noise reads clearly.
// Fresnel, spectral color, and iridescence arrive next.
// ------------------------------------------------------------
export const fragmentShader = /* glsl */ `
precision highp float;

varying vec3 v_normal;
varying vec3 v_viewDir;
varying vec3 v_objPos;
varying float v_disp;
varying float v_spike;

void main() {
  vec3 N = normalize(v_normal);
  // matches the JSX key light direction so the shaded body agrees
  // with the rest of the scene while the real shading is built
  vec3 L = normalize(vec3(2.5, 3.0, 2.0));
  float diff = max(dot(N, L), 0.0);

  vec3 shadow = vec3(0.05, 0.03, 0.10);
  vec3 lit    = vec3(0.36, 0.22, 0.52);
  vec3 base = mix(shadow, lit, diff);

  // valleys darken, crests lighten — sells the relief even unlit
  base *= 0.75 + v_disp * 1.4;

  gl_FragColor = vec4(base, 1.0);
}
`
