const cloudVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = worldPosition.xyz;
    vObjectPosition = normalize(position);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export default cloudVertexShader
