import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useSolarStore } from "../store/solarStore";
import { SolarScene } from "./SolarScene";

export function SolarCanvas() {
  const qualityMode = useSolarStore((state) => state.qualityMode);

  return (
    <div className="solar-canvas-shell" aria-hidden="true">
      <Canvas
        dpr={qualityMode === "high" ? [1, 2] : [1, 1.5]}
        gl={{
          antialias: qualityMode === "high",
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{
          position: [0, 8, 34],
          fov: 40,
          near: 0.1,
          far: 420,
        }}
      >
        <Suspense fallback={null}>
          <SolarScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
