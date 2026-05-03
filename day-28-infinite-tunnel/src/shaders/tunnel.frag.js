/**
 * Tunnel fragment shader.
 * Basic noise-based color output driven by UV and time.
 * Will be enhanced in commit 6 with rich iridescent patterns.
 */
const tunnelFrag = /* glsl */ `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_speed;
  uniform vec2 u_mouseInfluence;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vDepth;

  /* Simple 2D hash for noise generation */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  /* Value noise */
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  /* Convert HSL to RGB */
  vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  void main() {
    /* Map UV.x around the tube circumference, UV.y along the tube length */
    float angle = vUv.x * 6.28318;  // 2*PI
    float depth = vUv.y * 20.0;

    /* Base noise pattern */
    float t = u_time * 0.3;
    float n = noise(vec2(angle * 2.0 + t, depth - u_time * 0.5));

    /* Hue shifts based on depth and time */
    float hue = fract(depth * 0.05 + t * 0.1 + n * 0.3);
    float saturation = 0.7;
    float lightness = 0.3 + n * 0.4;

    vec3 color = hsl2rgb(hue, saturation, lightness);

    /* Depth-based fade (fog substitute within shader) */
    float fogFactor = smoothstep(5.0, 80.0, vDepth);
    color = mix(color, vec3(0.0), fogFactor);

    /* Glow on nearby walls */
    float glow = smoothstep(30.0, 0.0, vDepth) * 0.15;
    color += glow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export default tunnelFrag
