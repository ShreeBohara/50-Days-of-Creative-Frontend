// ============================================================
// Blob shaders — the heart of day 62.
//
// The blob is a high-resolution icosphere whose vertices are
// pushed along their normals by layered noise (added in the
// vertex-noise stage) and whose surface color reacts to the
// audio spectrum (fragment stage). Uniforms are created once
// per material and mutated every frame — never recreated.
// ============================================================

export function createBlobUniforms() {
  return {
    u_time: { value: 0 },
  }
}

// ------------------------------------------------------------
// VERTEX — for now a passthrough that hands the fragment shader
// world-space normal + view direction. Displacement layers land
// in the next stage.
// ------------------------------------------------------------
export const vertexShader = /* glsl */ `
uniform float u_time;

varying vec3 v_normal;   // world-space surface normal
varying vec3 v_viewDir;  // surface -> camera, world space
varying vec3 v_objPos;   // object-space position (noise domain later)

void main() {
  vec3 pos = position;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  v_objPos = pos;
  // model matrix is rotation+uniform-scale only, so mat3 is safe for normals
  v_normal = normalize(mat3(modelMatrix) * normal);
  v_viewDir = normalize(cameraPosition - world.xyz);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`

// ------------------------------------------------------------
// FRAGMENT — placeholder lambert so the geometry stage is
// visible and lightable. Fresnel, spectral color, and
// iridescence arrive in the fragment stage.
// ------------------------------------------------------------
export const fragmentShader = /* glsl */ `
precision highp float;

varying vec3 v_normal;
varying vec3 v_viewDir;
varying vec3 v_objPos;

void main() {
  vec3 N = normalize(v_normal);
  // matches the JSX key light direction so the shaded body agrees
  // with the rest of the scene while the real shading is built
  vec3 L = normalize(vec3(2.5, 3.0, 2.0));
  float diff = max(dot(N, L), 0.0);

  vec3 shadow = vec3(0.05, 0.03, 0.10);
  vec3 lit    = vec3(0.36, 0.22, 0.52);
  vec3 base = mix(shadow, lit, diff);

  gl_FragColor = vec4(base, 1.0);
}
`
