// Terrain — the pure half. Stacked ridgelines (the Unknown Pleasures
// silhouette) whose height is a seeded envelope in x and in depth, sampled
// from the frame's noise at a fixed 160 samples per line.
import { range, rangeInt, pick } from "../rng.js";
import { mixHex, withAlpha } from "../color.js";

export const SAMPLES = 160;
export const MAX_RIDGES = 72;
export const TERRAIN_DRAWS = 15 + MAX_RIDGES;

export function planTerrain(rng) {
  const ridgeCount = rangeInt(rng, 40, 72);
  const band = { y0: range(rng, 0.16, 0.3), y1: range(rng, 0.8, 0.9) };
  const peak = { cx: range(rng, 0.35, 0.65), width: range(rng, 0.18, 0.32) };
  const amplitude = range(rng, 0.12, 0.22);
  const depthPeak = range(rng, 0.35, 0.7);
  const noiseScale = range(rng, 2.5, 5);
  const noiseOffset = { x: range(rng, 0, 100), y: range(rng, 0, 100) };
  const ridgeStep = range(rng, 0.35, 0.7);
  const strokeWidth = range(rng, 1.6, 3.2);
  const gradientMode = rangeInt(rng, 0, 2);
  const headlineWeight = pick(rng, [800, 900]);
  const headlineLines = pick(rng, [1, 1, 2]);
  const phases = [];
  for (let i = 0; i < MAX_RIDGES; i += 1) phases.push(rng() * 10);
  return {
    ridgeCount, band, peak, amplitude, depthPeak, noiseScale, noiseOffset, ridgeStep,
    strokeWidth, gradientMode, headlineWeight, headlineLines, phases,
  };
}

/** Depth position of ridge i in [0, 1] (0 = back/top, 1 = front/bottom). */
export function depthT(plan, i) {
  return plan.ridgeCount > 1 ? i / (plan.ridgeCount - 1) : 0;
}

/** Baseline y of ridge i in poster units. */
export function ridgeBase(plan, i, H = 1600) {
  return (plan.band.y0 + (plan.band.y1 - plan.band.y0) * depthT(plan, i)) * H;
}

/** Gaussian bump across the width, 1 at the seeded peak column. */
export function horizontalEnvelope(plan, u) {
  const d = (u - plan.peak.cx) / plan.peak.width;
  return Math.exp(-d * d);
}

/** Gaussian bump through depth, 1 at the seeded depth peak. */
export function depthEnvelope(plan, i) {
  const d = (depthT(plan, i) - plan.depthPeak) / 0.32;
  return Math.exp(-d * d);
}

/** Points along ridge i (SAMPLES + 1), left to right, inside the margins. */
export function ridgeProfile(plan, i, noise2D, W = 1200, H = 1600, M = 72) {
  const base = ridgeBase(plan, i, H);
  const env = depthEnvelope(plan, i);
  const points = [];
  for (let k = 0; k <= SAMPLES; k += 1) {
    const x = M + ((W - M * 2) * k) / SAMPLES;
    const u = x / W;
    const n = Math.abs(noise2D(
      u * plan.noiseScale + plan.noiseOffset.x,
      i * plan.ridgeStep + plan.noiseOffset.y + plan.phases[i % MAX_RIDGES],
    ));
    const lift = horizontalEnvelope(plan, u) * env * (0.2 + 0.8 * Math.min(1, n));
    points.push({ x, y: base - plan.amplitude * H * lift });
  }
  return points;
}

/** Interpolates through the palette's colour stops. */
export function rampColor(colors, t) {
  const k = Math.min(1, Math.max(0, t)) * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(k));
  return mixHex(colors[i], colors[i + 1], k - i);
}

/** Stroke colour of ridge i for the plan's gradient mode. */
export function depthColor(plan, palette, i) {
  const t = depthT(plan, i);
  if (plan.gradientMode === 0) return rampColor(palette.colors, t);
  if (plan.gradientMode === 1) return mixHex(palette.accent, palette.ink, t);
  return withAlpha(palette.ink, 0.45 + 0.55 * t);
}

/**
 * Where the lines pack tightest: the flat stack in front of the amplitude
 * peak (at the peak itself the ridges fan apart). The headline is knocked
 * out of this region so it reads as negative space across many lines.
 */
export function densestRegion(plan) {
  const t = Math.min(0.93, Math.max(0.62, plan.depthPeak + 0.36));
  return {
    cx: 0.5,
    cy: plan.band.y0 + (plan.band.y1 - plan.band.y0) * t,
  };
}
