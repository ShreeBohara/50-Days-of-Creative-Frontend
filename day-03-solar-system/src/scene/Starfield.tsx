import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "../store/solarStore";

function buildStars(count: number, radiusMin: number, radiusMax: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(radiusMin, radiusMax);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const offset = index * 3;

    positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = radius * Math.cos(phi);
    positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);

    color.setHSL(
      THREE.MathUtils.randFloat(0.52, 0.66),
      THREE.MathUtils.randFloat(0.35, 0.85),
      THREE.MathUtils.randFloat(0.72, 0.98)
    );

    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  return { positions, colors };
}

export function Starfield() {
  const qualityMode = useSolarStore((state) => state.qualityMode);
  const nearGroupRef = useRef<THREE.Group | null>(null);
  const farGroupRef = useRef<THREE.Group | null>(null);

  const nearField = useMemo(
    () => buildStars(qualityMode === "high" ? 2200 : 1200, 90, 220),
    [qualityMode]
  );
  const farField = useMemo(
    () => buildStars(qualityMode === "high" ? 1600 : 800, 180, 300),
    [qualityMode]
  );

  useFrame((state, delta) => {
    if (nearGroupRef.current) {
      nearGroupRef.current.rotation.y += delta * 0.005;
      nearGroupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.08;
    }

    if (farGroupRef.current) {
      farGroupRef.current.rotation.y -= delta * 0.0025;
    }
  });

  return (
    <>
      <group ref={nearGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[nearField.positions, 3]}
            />
            <bufferAttribute attach="attributes-color" args={[nearField.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.95}
            sizeAttenuation
            transparent
            opacity={0.95}
            depthWrite={false}
            vertexColors
          />
        </points>
      </group>

      <group ref={farGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[farField.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[farField.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.6}
            sizeAttenuation
            transparent
            opacity={0.36}
            depthWrite={false}
            vertexColors
          />
        </points>
      </group>
    </>
  );
}
