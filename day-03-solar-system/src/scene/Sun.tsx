import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "../store/solarStore";

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const sunFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uTime;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 191.999))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = mix(
      mix(
        mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );

    return n;
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.2);
    float glow = fbm(normal * 3.5 + vec3(uTime * 0.25, -uTime * 0.18, uTime * 0.12));
    float pulse = sin(uTime * 1.7 + normal.y * 7.0) * 0.08 + 0.92;

    vec3 core = mix(vec3(1.0, 0.78, 0.38), vec3(1.0, 0.45, 0.16), glow);
    vec3 rim = vec3(1.0, 0.89, 0.56) * fresnel * 1.4;
    vec3 color = (core * pulse) + rim;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const coronaFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uTime;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 191.999))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = mix(
      mix(
        mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );

    return n;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 1.6);
    float corona = noise(normal * 4.0 + vec3(uTime * 0.2, uTime * 0.1, -uTime * 0.16));
    float alpha = smoothstep(0.2, 1.0, fresnel) * (0.18 + corona * 0.42);
    vec3 color = mix(vec3(1.0, 0.68, 0.32), vec3(1.0, 0.89, 0.58), corona);

    gl_FragColor = vec4(color, alpha);
  }
`;

export function Sun() {
  const qualityMode = useSolarStore((state) => state.qualityMode);
  const coreMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (coreMaterialRef.current) {
      coreMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (coronaMaterialRef.current) {
      coronaMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    state.scene.rotation.y += delta * 0.0008;
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh>
        <sphereGeometry args={[5.8, 96, 96]} />
        <shaderMaterial
          ref={coreMaterialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={sunFragmentShader}
        />
      </mesh>

      <mesh scale={1.46}>
        <sphereGeometry args={[5.8, 80, 80]} />
        <shaderMaterial
          ref={coronaMaterialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={coronaFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <pointLight position={[0, 0, 0]} intensity={qualityMode === "high" ? 8 : 5.8} distance={200} color="#ffc774" />

      <Sparkles
        count={qualityMode === "high" ? 44 : 22}
        size={qualityMode === "high" ? 6 : 4}
        scale={[18, 18, 18]}
        speed={0.45}
        color="#ffd59a"
        opacity={0.7}
      />
    </group>
  );
}
