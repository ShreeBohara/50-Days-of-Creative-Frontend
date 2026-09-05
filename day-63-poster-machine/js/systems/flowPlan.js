// Flow Field — the pure half. 2000 stroke candidates are drawn up front so
// the rng is consumed identically whatever the letter, palette or size;
// the mask only decides which candidates survive.
import { range, rangeInt, chance } from "../rng.js";

export const STROKE_COUNT = 2000;
export const FLOW_DRAWS = 13 + STROKE_COUNT * 5;

export function planFlow(rng) {
  const noiseScale = range(rng, 1.6, 3.2);
  const offset = { x: range(rng, 0, 100), y: range(rng, 0, 100) };
  const angleBias = range(rng, 0, Math.PI * 2);
  const curl = range(rng, 1.5, 3.5);
  const stepLength = range(rng, 6, 11);
  const steps = rangeInt(rng, 8, 14);
  const outsideDensity = range(rng, 0.06, 0.16);
  const letterScale = range(rng, 0.78, 0.9);
  const letterOffset = { x: range(rng, -0.04, 0.04), y: range(rng, -0.06, 0.02) };
  const inkOutside = chance(rng, 0.5);
  const accentShare = range(rng, 0.1, 0.35);
  const strokes = [];
  for (let i = 0; i < STROKE_COUNT; i += 1) {
    strokes.push({ x: rng(), y: rng(), t: rng(), jitter: rng(), colorIdx: Math.floor(rng() * 5) });
  }
  return {
    noiseScale, offset, angleBias, curl, stepLength, steps, outsideDensity,
    letterScale, letterOffset, inkOutside, accentShare, strokes,
  };
}

/** First drawable character of the headline, uppercased; "A" when empty. */
export function firstLetter(headline) {
  const match = String(headline ?? "").match(/\S/);
  return match ? match[0].toUpperCase() : "A";
}

/** Survival test: inside the letter (m → 1) nearly everything survives. */
export function keepStroke(m, t, outsideDensity) {
  const density = m * (1 - outsideDensity) + outsideDensity;
  return t <= density;
}

/** Walks one stroke along the field; returns steps + 1 points in poster units. */
export function tracePath(start, plan, noise2D, W = 1200, H = 1600) {
  let x = start.x * W;
  let y = start.y * H;
  const points = [{ x, y }];
  for (let k = 0; k < plan.steps; k += 1) {
    const n = noise2D((x / W) * plan.noiseScale + plan.offset.x, (y / W) * plan.noiseScale + plan.offset.y);
    const angle = plan.angleBias + n * Math.PI * plan.curl;
    x += Math.cos(angle) * plan.stepLength;
    y += Math.sin(angle) * plan.stepLength;
    points.push({ x, y });
  }
  return points;
}
