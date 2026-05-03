/**
 * Tunnel vertex shader with cross-section morphing.
 * Morphs the tube cross-section between circle, hexagon, and star shapes.
 * Also adds radial displacement noise for organic "breathing" walls.
 */
const tunnelVert = /* glsl */ `
  uniform float u_time;
  uniform float u_speed;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vDepth;

  /* Simple 2D hash */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vUv = uv;
    vPosition = position;

    /* ── Compute the tube's local radial direction ─────────── */
    /* UV.x goes around the circumference: 0→1 = full circle */
    float angle = uv.x * 6.28318;  // 2*PI

    /* Local radial direction from center of tube cross-section */
    vec3 radialDir = normalize(vec3(cos(angle), sin(angle), 0.0));

    /* ── Cross-section morphing ────────────────────────────── */
    /*
     * Morph cycle: circle → hexagon → star → circle
     * Each shape is defined by a radial multiplier as a function of angle.
     */
    float morphTime = u_time * 0.12;    // slow cycle
    float morphPhase = fract(morphTime); // 0→1 cycle
    float morphIndex = mod(floor(morphTime), 3.0); // 0, 1, 2

    /* Shape functions (radial displacement at given angle) */

    /* Hexagon: modulate radius with cos(6*angle) */
    float hexShape = 1.0 + 0.08 * cos(6.0 * angle);

    /* Star: modulate with cos(5*angle), deeper valleys */
    float starShape = 1.0 + 0.15 * cos(5.0 * angle + u_time * 0.3);

    /* Circle: uniform radius */
    float circleShape = 1.0;

    /* Blend between shapes based on morph phase */
    float shapeFactor;
    if (morphIndex < 1.0) {
      shapeFactor = mix(circleShape, hexShape, smoothstep(0.0, 1.0, morphPhase));
    } else if (morphIndex < 2.0) {
      shapeFactor = mix(hexShape, starShape, smoothstep(0.0, 1.0, morphPhase));
    } else {
      shapeFactor = mix(starShape, circleShape, smoothstep(0.0, 1.0, morphPhase));
    }

    /* ── Organic breathing — radial noise displacement ─────── */
    float breathe = noise2D(vec2(angle * 2.0, uv.y * 15.0 - u_time * 0.4)) * 0.25;
    breathe += noise2D(vec2(angle * 4.0, uv.y * 30.0 + u_time * 0.2)) * 0.1;

    /* Pulse effect synced to time */
    float pulse = sin(u_time * 0.8 + uv.y * 20.0) * 0.05;

    /* ── Apply radial offset ──────────────────────────────── */
    float totalOffset = (shapeFactor - 1.0) + breathe + pulse;

    /* Get the normal direction (pointing outward from the tube center) */
    vec3 displaced = position + normal * totalOffset;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`

export default tunnelVert
