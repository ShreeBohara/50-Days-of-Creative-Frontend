export const MIN_POINTS = 3;
export const MAX_POINTS = 6;

const DEFAULT_COLORS = [
  "#00F5D4",
  "#64DFDF",
  "#4EA8DE",
  "#7B2CBF",
  "#C77DFF",
  "#80FFDB",
];

const POINT_BLUEPRINTS = [
  { x: 0.18, y: 0.2, radius: 0.56, seedX: 12.1, seedY: 74.2, phase: 0.3 },
  { x: 0.73, y: 0.17, radius: 0.62, seedX: 94.7, seedY: 8.8, phase: 1.7 },
  { x: 0.48, y: 0.53, radius: 0.58, seedX: 33.4, seedY: 52.6, phase: 2.9 },
  { x: 0.82, y: 0.76, radius: 0.57, seedX: 66.3, seedY: 24.9, phase: 4.1 },
  { x: 0.2, y: 0.81, radius: 0.6, seedX: 5.2, seedY: 88.4, phase: 5.4 },
  { x: 0.56, y: 0.93, radius: 0.52, seedX: 45.8, seedY: 39.1, phase: 0.9 },
];

export function clampPointCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(MAX_POINTS, Math.max(MIN_POINTS, parsed));
}

export function createDefaultScene({ reducedMotion = false } = {}) {
  return {
    presetId: "aurora",
    baseColor: "#061A24",
    pointCount: 5,
    points: POINT_BLUEPRINTS.map((point, index) => ({
      ...point,
      color: DEFAULT_COLORS[index],
    })),
    settings: {
      speed: 0.55,
      size: 1,
      grain: 0.08,
      vignette: true,
      playing: !reducedMotion,
    },
  };
}

export function setPointCount(scene, value) {
  scene.pointCount = clampPointCount(value);
  return scene.pointCount;
}
