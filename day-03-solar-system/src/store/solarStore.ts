import { create } from "zustand";
import type { ChapterId, PlanetId, QualityMode } from "../data/solarData";
import { defaultChapterId } from "../data/solarData";

interface SolarState {
  activeChapter: ChapterId;
  selectedPlanet: PlanetId | null;
  qualityMode: QualityMode;
  overlayOpen: boolean;
  isGuidedCameraActive: boolean;
  reducedMotion: boolean;
  setActiveChapter: (chapter: ChapterId) => void;
  selectPlanet: (planet: PlanetId | null) => void;
  setQualityMode: (mode: QualityMode) => void;
  setOverlayOpen: (open: boolean) => void;
  setGuidedCameraActive: (active: boolean) => void;
  setReducedMotion: (value: boolean) => void;
}

export const useSolarStore = create<SolarState>((set) => ({
  activeChapter: defaultChapterId,
  selectedPlanet: null,
  qualityMode: "balanced",
  overlayOpen: false,
  isGuidedCameraActive: true,
  reducedMotion: false,
  setActiveChapter: (chapter) =>
    set((state) => ({
      activeChapter: chapter,
      isGuidedCameraActive: state.selectedPlanet ? state.isGuidedCameraActive : true,
    })),
  selectPlanet: (planet) =>
    set({
      selectedPlanet: planet,
      overlayOpen: planet !== null,
      isGuidedCameraActive: true,
    }),
  setQualityMode: (mode) => set({ qualityMode: mode }),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
  setGuidedCameraActive: (active) => set({ isGuidedCameraActive: active }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
}));
