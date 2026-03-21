import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { chaptersById, planetsById } from "../data/solarData";
import { getPlanetMesh } from "./PlanetSystem";
import { useSolarStore } from "../store/solarStore";

export function CinematicCamera() {
  const { camera } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const controlsRef = useRef<any>(null);
  const holdUntilRef = useRef(0);
  const positionTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const focusOffset = useMemo(() => new THREE.Vector3(), []);
  const planetWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const guided = useSolarStore((state) => state.isGuidedCameraActive);
  const reducedMotion = useSolarStore((state) => state.reducedMotion);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);

  useEffect(() => {
    if (!selectedPlanet) {
      return;
    }

    setGuidedCameraActive(true);
  }, [selectedPlanet, setGuidedCameraActive]);

  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const chapter = chaptersById[activeChapter];
    const planet = selectedPlanet ? planetsById[selectedPlanet] : null;
    const desiredFov = planet ? 30 : chapter.camera.fov ?? 38;

    if (planet && selectedPlanet) {
      const selectedMesh = getPlanetMesh(selectedPlanet);

      if (selectedMesh) {
        selectedMesh.getWorldPosition(planetWorldPosition);
        focusOffset.set(
          planet.focus.position[0] - planet.focus.target[0],
          planet.focus.position[1] - planet.focus.target[1],
          planet.focus.position[2] - planet.focus.target[2]
        );
        positionTarget.copy(planetWorldPosition).add(focusOffset);
        lookTarget.copy(planetWorldPosition);
      } else {
        positionTarget.set(...planet.focus.position);
        lookTarget.set(...planet.focus.target);
      }
    } else {
      positionTarget.set(...chapter.camera.position);
      lookTarget.set(...chapter.camera.target);
    }

    const shouldGuide = guided && state.clock.elapsedTime > holdUntilRef.current;
    const positionLerp = reducedMotion ? 0.14 : planet ? 0.065 : 0.045;
    const targetLerp = reducedMotion ? 0.18 : planet ? 0.11 : 0.08;

    if (shouldGuide) {
      perspectiveCamera.position.lerp(positionTarget, positionLerp);
      controls.target.lerp(lookTarget, targetLerp);
      perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, desiredFov, 0.06);
      perspectiveCamera.updateProjectionMatrix();
    }

    controls.minDistance = planet ? Math.max(planet.size * 2.6, 6) : 14;
    controls.maxDistance = planet ? Math.max(planet.size * 7.4, 20) : 160;
    controls.autoRotate = !selectedPlanet && activeChapter === "overview" && shouldGuide;
    controls.autoRotateSpeed = 0.28;
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.5}
      minDistance={14}
      maxDistance={160}
      onStart={() => {
        holdUntilRef.current = Number.POSITIVE_INFINITY;
        setGuidedCameraActive(false);
      }}
      onEnd={() => {
        holdUntilRef.current = 0;
        window.setTimeout(() => {
          setGuidedCameraActive(true);
        }, 1200);
      }}
    />
  );
}
