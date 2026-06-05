import simplexNoise from './noise'

const planetVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_seed;
  uniform float u_oceanLevel;
  uniform float u_mountainHeight;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying float vHeight;
  varying float vOceanMask;

  ${simplexNoise}

  float terrainHeight(vec3 point) {
    vec3 seedOffset = vec3(u_seed * 0.137, u_seed * 0.311, u_seed * 0.719);
    float continents = fbm(point * 1.18 + seedOffset);
    float continentMask = smoothstep(-0.28, 0.46, continents);
    float shelfNoise = fbm(point * 2.45 + seedOffset * 1.41);
    float mountainNoise = fbm(point * 4.8 + seedOffset * 2.13);
    float ridge = 1.0 - abs(snoise(point * 8.2 + seedOffset * 3.07));

    ridge = pow(clamp(ridge, 0.0, 1.0), 3.0);
    mountainNoise = pow(max(mountainNoise, 0.0), 2.0);

    return clamp(
      continentMask * 0.64
      + shelfNoise * 0.16
      + mountainNoise * continentMask * 0.34
      + ridge * continentMask * 0.22,
      0.0,
      1.0
    );
  }

  void main() {
    vec3 spherePoint = normalize(position);
    float height = terrainHeight(spherePoint);
    float oceanMask = smoothstep(u_oceanLevel - 0.035, u_oceanLevel + 0.025, height);
    float landLift = max(height - u_oceanLevel, 0.0) * u_mountainHeight;
    float oceanDrop = (1.0 - oceanMask) * -0.028;
    vec3 displacedPosition = position + normal * (landLift + oceanDrop);
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);

    vObjectPosition = spherePoint;
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vHeight = height;
    vOceanMask = oceanMask;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export default planetVertexShader
