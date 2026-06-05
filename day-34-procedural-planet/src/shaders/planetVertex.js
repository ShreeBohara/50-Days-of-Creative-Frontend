const planetVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_seed;
  uniform float u_oceanLevel;
  uniform float u_mountainHeight;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying float vHeight;

  void main() {
    vec3 displacedPosition = position;
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);

    vObjectPosition = normalize(position);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vHeight = 0.0;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export default planetVertexShader
