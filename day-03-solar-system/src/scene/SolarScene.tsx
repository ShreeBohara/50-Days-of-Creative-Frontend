import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useSolarStore } from "../store/solarStore";
import { CinematicCamera } from "./CinematicCamera";
import { NebulaField } from "./NebulaField";
import { PlanetSystem } from "./PlanetSystem";
import { PostFX } from "./PostFX";
import { Starfield } from "./Starfield";
import { Sun } from "./Sun";

export function SolarScene() {
  const qualityMode = useSolarStore((state) => state.qualityMode);
  const setQualityMode = useSolarStore((state) => state.setQualityMode);
  const samplesRef = useRef({ frames: 0, total: 0, downgraded: false });

  useFrame((_, delta) => {
    if (qualityMode !== "high" || samplesRef.current.downgraded) {
      return;
    }

    samplesRef.current.frames += 1;
    samplesRef.current.total += delta;

    if (samplesRef.current.frames >= 160) {
      const average = samplesRef.current.total / samplesRef.current.frames;
      if (average > 0.031) {
        samplesRef.current.downgraded = true;
        setQualityMode("balanced");
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 140, 320]} />
      <ambientLight intensity={0.32} color="#8fb7ff" />
      <directionalLight position={[50, 20, 30]} intensity={0.45} color="#8ecaff" />
      <NebulaField />
      <Starfield />
      <Sun />
      <PlanetSystem />
      {qualityMode === "high" && (
        <Sparkles
          count={36}
          size={5}
          scale={[120, 40, 120]}
          speed={0.2}
          color="#ffd7aa"
          opacity={0.35}
        />
      )}
      <CinematicCamera />
      <PostFX />
    </>
  );
}
