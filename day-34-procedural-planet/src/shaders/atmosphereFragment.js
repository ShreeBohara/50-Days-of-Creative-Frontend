const atmosphereFragmentShader = /* glsl */ `
  uniform float u_thickness;
  uniform vec3 u_sunDirection;
  uniform vec3 u_color;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(u_sunDirection);

    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.35);
    float sunWrap = smoothstep(-0.35, 0.72, dot(normal, sunDirection));
    float alpha = fresnel * (0.18 + u_thickness * 1.45) * (0.45 + sunWrap * 0.72);

    gl_FragColor = vec4(u_color, alpha);
  }
`

export default atmosphereFragmentShader
