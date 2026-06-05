const planetFragmentShader = /* glsl */ `
  uniform vec3 u_sunDirection;
  uniform float u_oceanLevel;

  varying vec3 vNormal;
  varying vec3 vObjectPosition;
  varying float vHeight;
  varying float vOceanMask;

  vec3 colorRamp(float heightValue) {
    vec3 ocean = vec3(0.02, 0.12, 0.30);
    vec3 coast = vec3(0.05, 0.34, 0.58);
    vec3 land = vec3(0.12, 0.42, 0.28);

    float waterBlend = smoothstep(0.0, u_oceanLevel, heightValue);
    vec3 water = mix(ocean, coast, waterBlend);
    return mix(water, land, smoothstep(u_oceanLevel - 0.04, u_oceanLevel + 0.08, heightValue));
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDirection = normalize(u_sunDirection);
    float diffuse = max(dot(normal, sunDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);

    vec3 baseColor = colorRamp(vHeight);
    vec3 nightColor = vec3(0.006, 0.012, 0.035);
    vec3 color = mix(nightColor, baseColor, 0.18 + diffuse * 0.92);
    color += rim * vec3(0.02, 0.20, 0.38);

    gl_FragColor = vec4(color, 1.0);
  }
`

export default planetFragmentShader
