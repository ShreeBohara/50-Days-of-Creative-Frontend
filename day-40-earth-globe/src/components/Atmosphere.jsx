import * as THREE from 'three'
import { GLOBE_RADIUS } from './EarthGlobe'

const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 2.15);
    vec3 glow = mix(vec3(0.05, 0.28, 0.56), vec3(0.25, 0.88, 1.0), fresnel);
    gl_FragColor = vec4(glow, fresnel * 0.68);
  }
`

export default function Atmosphere() {
  return (
    <mesh scale={1.055}>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
