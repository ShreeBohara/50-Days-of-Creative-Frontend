const planetFragmentShader = /* glsl */ `
  #extension GL_OES_standard_derivatives : enable

  uniform vec3 u_sunDirection;
  uniform float u_oceanLevel;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  varying float vHeight;
  varying float vOceanMask;

  vec3 colorRamp(float heightValue) {
    vec3 deepOcean = vec3(0.004, 0.036, 0.105);
    vec3 shallowWater = vec3(0.02, 0.36, 0.58);
    vec3 beach = vec3(0.72, 0.62, 0.38);
    vec3 grass = vec3(0.15, 0.45, 0.26);
    vec3 forest = vec3(0.035, 0.22, 0.13);
    vec3 stone = vec3(0.46, 0.48, 0.50);
    vec3 snow = vec3(0.88, 0.94, 0.96);

    vec3 color = mix(deepOcean, shallowWater, smoothstep(0.04, u_oceanLevel, heightValue));
    color = mix(color, beach, smoothstep(u_oceanLevel - 0.035, u_oceanLevel + 0.018, heightValue));
    color = mix(color, grass, smoothstep(u_oceanLevel + 0.02, u_oceanLevel + 0.14, heightValue));
    color = mix(color, forest, smoothstep(u_oceanLevel + 0.17, u_oceanLevel + 0.33, heightValue));
    color = mix(color, stone, smoothstep(0.67, 0.82, heightValue));
    color = mix(color, snow, smoothstep(0.82, 0.96, heightValue));

    float polarSnow = smoothstep(0.55, 0.92, abs(vObjectPosition.y)) * smoothstep(u_oceanLevel, u_oceanLevel + 0.2, heightValue);
    return mix(color, snow, polarSnow * 0.45);
  }

  vec3 displacedNormal() {
    vec3 derivativeNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    derivativeNormal = faceforward(derivativeNormal, -vWorldPosition, normalize(vNormal));
    return normalize(mix(normalize(vNormal), derivativeNormal, 0.72));
  }

  void main() {
    vec3 normal = displacedNormal();
    vec3 sunDirection = normalize(u_sunDirection);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 halfDirection = normalize(sunDirection + viewDirection);

    float diffuse = max(dot(normal, sunDirection), 0.0);
    float night = smoothstep(-0.28, 0.08, dot(normal, sunDirection));
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float waterMask = 1.0 - vOceanMask;
    float specular = pow(max(dot(normal, halfDirection), 0.0), 96.0) * waterMask * smoothstep(0.0, 0.45, diffuse);

    vec3 baseColor = colorRamp(vHeight);
    vec3 nightColor = vec3(0.006, 0.012, 0.035);
    vec3 litColor = baseColor * (0.26 + diffuse * 1.08);
    vec3 color = mix(nightColor, litColor, night);

    color += specular * vec3(0.72, 0.92, 1.0);
    color += rim * vec3(0.018, 0.19, 0.34);

    gl_FragColor = vec4(color, 1.0);
  }
`

export default planetFragmentShader
