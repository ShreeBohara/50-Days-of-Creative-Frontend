import { Suspense, lazy, useEffect, useRef } from "react";
import { chapters } from "./data/solarData";
import { useEnvironment } from "./hooks/useEnvironment";
import { useSolarStore } from "./store/solarStore";
import { HeroOverlay } from "./components/HeroOverlay";
import { ChapterRail } from "./components/ChapterRail";
import { PlanetDrawer } from "./components/PlanetDrawer";
import { FallbackView } from "./components/FallbackView";
import { QuickJump } from "./components/QuickJump";

const SolarCanvas = lazy(async () => {
  const module = await import("./scene/SolarCanvas");
  return { default: module.SolarCanvas };
});

export default function App() {
  const { reducedMotion, webglSupported, initialQuality } = useEnvironment();
  const selectedPlanet = useSolarStore((state) => state.selectedPlanet);
  const activeChapter = useSolarStore((state) => state.activeChapter);
  const setActiveChapter = useSolarStore((state) => state.setActiveChapter);
  const setQualityMode = useSolarStore((state) => state.setQualityMode);
  const setReducedMotion = useSolarStore((state) => state.setReducedMotion);
  const setGuidedCameraActive = useSolarStore((state) => state.setGuidedCameraActive);
  const autoTourRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setReducedMotion(reducedMotion);
    setQualityMode(webglSupported ? initialQuality : "fallback");
  }, [initialQuality, reducedMotion, setQualityMode, setReducedMotion, webglSupported]);

  // Auto-tour: advance chapters every 8 seconds when no planet is selected
  useEffect(() => {
    if (selectedPlanet) {
      if (autoTourRef.current) {
        clearInterval(autoTourRef.current);
        autoTourRef.current = null;
      }
      return;
    }

    autoTourRef.current = setInterval(() => {
      const currentIndex = chapters.findIndex((c) => c.id === useSolarStore.getState().activeChapter);
      const nextIndex = (currentIndex + 1) % chapters.length;
      setGuidedCameraActive(true);
      setActiveChapter(chapters[nextIndex].id);
    }, 8000);

    return () => {
      if (autoTourRef.current) {
        clearInterval(autoTourRef.current);
        autoTourRef.current = null;
      }
    };
  }, [selectedPlanet, setActiveChapter, setGuidedCameraActive]);

  if (!webglSupported) {
    return <FallbackView />;
  }

  return (
    <div className={selectedPlanet ? "day03-app is-planet-focus" : "day03-app"}>
      <Suspense fallback={<div className="canvas-loader">Initializing...</div>}>
        <SolarCanvas />
      </Suspense>
      <HeroOverlay />
      <ChapterRail />
      <QuickJump />
      <PlanetDrawer />
    </div>
  );
}
