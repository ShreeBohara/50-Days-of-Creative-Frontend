/**
 * Tunnel vertex shader.
 * Passes UV coordinates and world-space position to the fragment shader.
 * Will be enhanced in commit 7 with cross-section morphing.
 */
const tunnelVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vDepth;

  void main() {
    vUv = uv;
    vPosition = position;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`

export default tunnelVert
