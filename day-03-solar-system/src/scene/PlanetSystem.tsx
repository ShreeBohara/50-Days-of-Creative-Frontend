import { Line, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { planets, planetsById, type PlanetDefinition, type PlanetId } from "../data/solarData";
import { useSolarStore } from "../store/solarStore";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform float uPattern;
  uniform float uSelected;
  uniform float uHover;
  uniform vec3 uBaseA;
  uniform vec3 uBaseB;
  uniform vec3 uAccent;
  uniform vec3 uGlow;

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

    for (int i = 0; i < 7; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(vec3(-0.6, 0.22, 0.78));
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.4);
    float bands = sin((vUv.y + fbm(vWorldPosition * 0.06 + uTime * 0.03) * 0.18) * 40.0 + uTime * 0.4);
    float roughNoise = fbm(vWorldPosition * 0.32 + uTime * 0.1);
    float cloudNoise = fbm(vWorldPosition * 0.2 - uTime * 0.05);
    float stormNoise = fbm(vec3(vUv * 4.0, uTime * 0.18));

    float mask = roughNoise;

    // Detail noise layer for extra surface texture
    float detail = fbm(vWorldPosition * 1.2 + uTime * 0.02);

    if (uPattern < 0.5) {
      // Rocky (Mercury, Mars)
      mask = roughNoise;
      mask = mix(mask, mask * (0.7 + detail * 0.6), 0.35);
    } else if (uPattern < 1.5) {
      // Cloudy (Venus) — hazy banding with thick atmosphere feel
      mask = 0.5 + bands * 0.5;
      float cloudWisps = fbm(vWorldPosition * 0.4 + uTime * 0.03);
      mask = mix(mask, cloudWisps, 0.4);
    } else if (uPattern < 2.5) {
      // Terrestrial (Earth) — ocean/land with cloud overlay
      mask = mix(roughNoise, cloudNoise, 0.55);
      mask = mix(mask, mask * (0.7 + detail * 0.6), 0.35);
      // Cloud wisps as white overlay (handled in color mixing below)
    } else if (uPattern < 3.5) {
      // Banded (Jupiter, Saturn) — turbulence-modulated bands
      float turbulence = fbm(vWorldPosition * 0.15 + uTime * 0.04);
      mask = 0.5 + sin((vUv.y + turbulence * 0.12) * 40.0 + uTime * 0.3) * 0.35;
      mask = mix(mask, mask * (0.8 + detail * 0.4), 0.3);
    } else if (uPattern < 4.5) {
      // Ice (Uranus) — smooth gradients with subsurface scattering hint
      mask = smoothstep(0.22, 0.86, cloudNoise);
      float subsurface = fbm(vWorldPosition * 0.5 - uTime * 0.02);
      mask = mix(mask, subsurface, 0.25);
    } else {
      // Storm (Neptune) — dual-scale noise for turbulent storms
      float largeStorm = fbm(vWorldPosition * 0.18 + uTime * 0.08);
      float smallStorm = fbm(vWorldPosition * 0.6 + uTime * 0.15);
      mask = mix(0.5 + bands * 0.25, mix(largeStorm, smallStorm, 0.5), 0.65);
    }

    float light = max(dot(normal, lightDir), 0.0);
    vec3 base = mix(uBaseA, uBaseB, smoothstep(0.18, 0.86, mask));
    vec3 highlight = mix(base, uAccent, smoothstep(0.45, 0.98, mask));
    vec3 color = mix(base, highlight, 0.38 + uHover * 0.16);

    // Cloud wisps for Earth
    if (uPattern > 1.5 && uPattern < 2.5) {
      float clouds = fbm(vWorldPosition * 0.35 + uTime * 0.04);
      float cloudMask = smoothstep(0.45, 0.7, clouds);
      color = mix(color, vec3(1.0), cloudMask * 0.25);
    }

    color *= 0.35 + light * 1.1;

    // Specular highlights
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 64.0);
    color += vec3(1.0) * specular * 0.15 * (1.0 - smoothstep(0.3, 0.6, mask));

    color += uGlow * fresnel * (0.18 + uSelected * 0.22 + uHover * 0.12);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ringVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    float radial = abs(vUv.y - 0.5) * 2.0;
    float bands = sin(vUv.x * 120.0 + uTime * 0.1) * 0.12;
    float dust = hash(vec2(floor(vUv.x * 120.0), floor(vUv.y * 10.0))) * 0.35;

    // Cassini division gap
    float cassini = smoothstep(0.58, 0.60, vUv.x) * (1.0 - smoothstep(0.62, 0.64, vUv.x));
    float alpha = smoothstep(1.0, 0.2, radial) * (0.38 + bands + dust) * (1.0 - cassini * 0.85);

    // Shimmer animation
    float shimmer = sin(vUv.x * 200.0 + uTime * 0.5) * 0.04;

    vec3 color = mix(vec3(0.98, 0.91, 0.75), vec3(0.74, 0.60, 0.42), vUv.x);
    color += shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Atmosphere shell fragment shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    float atmosphere = pow(rim, 3.0) * uIntensity;
    gl_FragColor = vec4(uAtmosphereColor, atmosphere);
  }
`;

function patternIndex(pattern: PlanetDefinition["pattern"]) {
  switch (pattern) {
    case "rocky":
      return 0;
    case "cloudy":
      return 1;
    case "terrestrial":
      return 2;
    case "banded":
      return 3;
    case "ice":
      return 4;
    case "storm":
      return 5;
    default:
      return 0;
  }
}

function orbitPoints(radius: number) {
  return Array.from({ length: 181 }, (_, index) => {
    const angle = (index / 180) * Math.PI * 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number];
  });
}

const runtimePlanetMeshes = new Map<PlanetId, THREE.Mesh>();

export function getPlanetMesh(id: PlanetId) {
  return runtimePlanetMeshes.get(id) ?? null;
}

function PlanetMesh({ planet, angleOffset }: { planet: PlanetDefinition; angleOffset: number }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const auraMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const ringRef = useRef<THREE.ShaderMaterial | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const selectPlanet = useSolarStore((state) => state.selectPlanet);
  const setActiveChapter = useSolarStore((state) => state.setActiveChapter);
  const qualityMode = useSolarStore((state) => state.qualityMode);

  useCursor(hovered);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    runtimePlanetMeshes.set(planet.id, mesh);
    return () => {
      if (runtimePlanetMeshes.get(planet.id) === mesh) {
        runtimePlanetMeshes.delete(planet.id);
      }
    };
  }, [planet.id]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPattern: { value: patternIndex(planet.pattern) },
      uSelected: { value: 0 },
      uHover: { value: 0 },
      uBaseA: { value: new THREE.Color(planet.palette.baseA) },
      uBaseB: { value: new THREE.Color(planet.palette.baseB) },
      uAccent: { value: new THREE.Color(planet.palette.accent) },
      uGlow: { value: new THREE.Color(planet.palette.glow) },
    }),
    [planet]
  );

  const ringUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uAtmosphereColor: { value: new THREE.Color(planet.palette.atmosphereColor || planet.palette.glow) },
      uIntensity: { value: 1.2 },
    }),
    [planet]
  );

  useFrame((state, delta) => {
    if (groupRef.current) {
      const orbitScale = selectedPlanet ? 0.04 : 0.12;
      groupRef.current.rotation.y = angleOffset + state.clock.elapsedTime * planet.orbitSpeed * orbitScale;
      groupRef.current.rotation.z = planet.tilt * 0.12;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * planet.rotationSpeed * 0.16;
      const isSelected = selectedPlanet === planet.id;
      const targetScale = isSelected ? 1.12 : hovered ? 1.05 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uSelected.value,
        selectedPlanet === planet.id ? 1 : 0,
        0.12
      );
      materialRef.current.uniforms.uHover.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uHover.value,
        hovered ? 1 : 0,
        0.16
      );
    }

    if (ringRef.current) {
      ringRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (auraMaterialRef.current) {
      const targetOpacity = selectedPlanet === planet.id ? 0.18 : hovered ? 0.07 : 0.02;
      auraMaterialRef.current.opacity = THREE.MathUtils.lerp(auraMaterialRef.current.opacity, targetOpacity, 0.14);
    }
  });

  const segments = qualityMode === "high" ? 128 : 72;

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={[planet.orbitRadius, 0, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          setActiveChapter(planet.chapter);
          selectPlanet(planet.id);
        }}
      >
        <sphereGeometry args={[planet.size, segments, segments]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>

      {/* Atmosphere shell */}
      <mesh position={[planet.orbitRadius, 0, 0]}>
        <sphereGeometry args={[planet.size * 1.03, 64, 64]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Soft outer aura */}
      <mesh position={[planet.orbitRadius, 0, 0]}>
        <sphereGeometry args={[planet.size * 1.38, 48, 48]} />
        <meshBasicMaterial
          ref={auraMaterialRef}
          color={planet.palette.glow}
          transparent
          opacity={0.02}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {planet.hasRing ? (
        <mesh position={[planet.orbitRadius, 0, 0]} rotation={[Math.PI / 2, 0, planet.tilt * 0.4]}>
          <ringGeometry args={[planet.size * 1.4, planet.size * 2.3, 128]} />
          <shaderMaterial
            ref={ringRef}
            uniforms={ringUniforms}
            vertexShader={ringVertexShader}
            fragmentShader={ringFragmentShader}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export function PlanetSystem() {
  return (
    <group>
      {planets.map((planet, index) => (
        <group key={planet.id}>
          <Line
            points={orbitPoints(planet.orbitRadius)}
            color={planetsById[planet.id].chapter === "outer-frontier" ? "#89a7cf" : "#a8bfd7"}
            transparent
            opacity={0.12}
            dashed
            dashScale={12}
            gapSize={0.85}
            lineWidth={0.9}
          />
          <PlanetMesh planet={planet} angleOffset={index * 0.72 + 0.3} />
        </group>
      ))}
    </group>
  );
}
