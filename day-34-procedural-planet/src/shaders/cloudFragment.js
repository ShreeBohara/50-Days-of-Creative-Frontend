import simplexNoise from './noise'

const cloudFragmentShader = /* glsl */ `
  uniform float u_time;
  uniform float u_seed;
  uniform float u_cloudDensity;
  uniform vec3 u_sunDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  ${simplexNoise}

  void main() {
    vec3 seedOffset = vec3(u_seed * 0.17, u_seed * 0.29, u_seed * 0.43);
    vec3 flow = vec3(u_time * 0.018, 0.0, -u_time * 0.011);
    float broad = fbm(vObjectPosition * 2.7 + seedOffset + flow);
    float wisps = fbm(vObjectPosition * 9.5 + seedOffset * 2.7 + flow * 2.0);
    float coverage = broad * 0.72 + wisps * 0.28;
    float threshold = mix(0.42, -0.06, u_cloudDensity);
    float cloudAlpha = smoothstep(threshold, threshold + 0.18, coverage);

    vec3 normal = normalize(vNormal);
    vec3 sunDirection = normalize(u_sunDirection);
    float light = smoothstep(-0.24, 0.85, dot(normal, sunDirection));
    float rim = pow(1.0 - max(dot(normal, normalize(cameraPosition - vWorldPosition)), 0.0), 2.6);
    vec3 cloudColor = mix(vec3(0.22, 0.37, 0.55), vec3(0.94, 0.98, 1.0), light);
    cloudColor += rim * vec3(0.24, 0.52, 0.78);

    gl_FragColor = vec4(cloudColor, cloudAlpha * 0.56);
  }
`

export default cloudFragmentShader
