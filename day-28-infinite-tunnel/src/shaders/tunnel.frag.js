/**
 * Tunnel fragment shader — psychedelic noise-based iridescent color flow.
 * Multi-octave simplex-style noise with HSL cycling, depth-based hue shift,
 * and organic flowing patterns that evolve over time.
 */
const tunnelFrag = /* glsl */ `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_speed;
  uniform vec2 u_mouseInfluence;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vDepth;

  /* ── Simplex-style 3D noise ────────────────────────────────── */
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
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

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  /* ── Fractal Brownian Motion (multi-octave noise) ──────────── */
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  /* ── HSL → RGB ─────────────────────────────────────────────── */
  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    float t = u_time * 0.15;

    /* Map UV.x around circumference, UV.y along tunnel length */
    float angle = vUv.x * 6.28318;
    float depth = vUv.y * 30.0;

    /* Build layered noise coordinates */
    vec3 noiseCoord = vec3(
      cos(angle) * 1.5,
      sin(angle) * 1.5,
      depth - u_time * 0.8
    );

    /* Large-scale flowing pattern */
    float n1 = fbm(noiseCoord * 0.4 + t * 0.3);

    /* Detail pattern — higher frequency, adds texture */
    float n2 = fbm(noiseCoord * 1.2 + vec3(t * 0.5, -t * 0.3, t * 0.7));

    /* Swirling warp — distort the noise with itself */
    float warp = fbm(noiseCoord * 0.6 + vec3(n1 * 2.0, n2 * 1.5, t * 0.2));

    /* Combine noise layers */
    float pattern = n1 * 0.4 + n2 * 0.3 + warp * 0.3;

    /* ── Iridescent HSL color cycling ────────────────────────── */

    /* Base hue shifts with depth, time, and mouse position */
    float hue = fract(
      depth * 0.015
      + t * 0.15
      + pattern * 0.5
      + u_mouseInfluence.x * 0.1
    );

    /* Saturation varies with pattern intensity */
    float saturation = 0.65 + pattern * 0.25;

    /* Lightness: pattern drives bright vs dark bands */
    float lightness = 0.15 + pattern * 0.45;

    /* Boost bright areas for bloom pickup */
    float brightBoost = smoothstep(0.5, 0.9, pattern) * 0.3;
    lightness += brightBoost;

    vec3 color = hsl2rgb(hue, saturation, lightness);

    /* ── Edge glow — brighten near edges of geometric features ── */
    float edgeGlow = abs(snoise(noiseCoord * 3.0 + t));
    edgeGlow = smoothstep(0.6, 0.95, edgeGlow) * 0.4;
    color += vec3(edgeGlow) * hsl2rgb(fract(hue + 0.3), 0.8, 0.6);

    /* ── Depth-based atmospheric fade ────────────────────────── */
    float fogFactor = smoothstep(3.0, 90.0, vDepth);
    color = mix(color, vec3(0.0), fogFactor);

    /* Nearby wall glow */
    float nearGlow = smoothstep(25.0, 0.0, vDepth) * 0.12;
    color += nearGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export default tunnelFrag
