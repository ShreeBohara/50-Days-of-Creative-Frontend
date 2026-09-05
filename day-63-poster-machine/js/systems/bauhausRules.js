// Bauhaus — the pure half. Twelve arrangement rules are plain data in
// fraction space (x and radii as fractions of the width, y of the height);
// planBauhaus() picks a rule, jitters its slots and assigns colour roles
// with a fixed number of draws; resolveShapes() turns that into poster units.
import { pick, range, rangeInt, chance } from "../rng.js";
import { isDark } from "../color.js";

const D = Math.atan2(1600, 1200); // page diagonal angle

export const RULES = [
  { name: "giant sun", shapes: [
    { kind: "circle", cx: 0.62, cy: 0.36, r: 0.38 },
    { kind: "circle", cx: 0.2, cy: 0.72, r: 0.09 },
    { kind: "bar", cx: 0.5, cy: 0.86, w: 0.9, h: 0.05 },
  ] },
  { name: "horizon semis", shapes: [
    { kind: "semi", cx: 0.5, cy: 0.55, r: 0.42, rot: Math.PI },
    { kind: "semi", cx: 0.5, cy: 0.55, r: 0.28, rot: 0 },
    { kind: "circle", cx: 0.5, cy: 0.55, r: 0.1 },
  ] },
  { name: "diagonal trio", shapes: [
    { kind: "bar", cx: 0.5, cy: 0.5, w: 1.6, h: 0.02, rot: D },
    { kind: "circle", cx: 0.24, cy: 0.24, r: 0.12 },
    { kind: "circle", cx: 0.5, cy: 0.5, r: 0.17 },
    { kind: "circle", cx: 0.76, cy: 0.76, r: 0.22 },
  ] },
  { name: "arc stack", shapes: [
    { kind: "arc", cx: 0.28, cy: 0.72, r: 0.56, w: 0.07, rot: -Math.PI / 2, span: Math.PI / 2 },
    { kind: "arc", cx: 0.28, cy: 0.72, r: 0.44, w: 0.07, rot: -Math.PI / 2, span: Math.PI / 2 },
    { kind: "arc", cx: 0.28, cy: 0.72, r: 0.32, w: 0.07, rot: -Math.PI / 2, span: Math.PI / 2 },
    { kind: "arc", cx: 0.28, cy: 0.72, r: 0.2, w: 0.07, rot: -Math.PI / 2, span: Math.PI / 2 },
    { kind: "circle", cx: 0.28, cy: 0.72, r: 0.08 },
  ] },
  { name: "quarter corners", shapes: [
    { kind: "quarter", cx: 0, cy: 0, r: 0.38, rot: 0 },
    { kind: "quarter", cx: 1, cy: 0, r: 0.3, rot: Math.PI / 2 },
    { kind: "quarter", cx: 1, cy: 1, r: 0.42, rot: Math.PI },
    { kind: "quarter", cx: 0, cy: 1, r: 0.26, rot: -Math.PI / 2 },
    { kind: "circle", cx: 0.5, cy: 0.5, r: 0.12 },
  ] },
  { name: "stripes and circle", shapes: [
    { kind: "bar", cx: 0.22, cy: 0.5, w: 0.09, h: 1.1 },
    { kind: "bar", cx: 0.5, cy: 0.5, w: 0.09, h: 1.1 },
    { kind: "bar", cx: 0.78, cy: 0.5, w: 0.09, h: 1.1 },
    { kind: "circle", cx: 0.5, cy: 0.42, r: 0.3 },
  ] },
  { name: "concentric", shapes: [
    { kind: "circle", cx: 0.5, cy: 0.46, r: 0.44 },
    { kind: "circle", cx: 0.5, cy: 0.46, r: 0.33 },
    { kind: "circle", cx: 0.5, cy: 0.46, r: 0.22 },
    { kind: "circle", cx: 0.5, cy: 0.46, r: 0.11 },
  ] },
  { name: "mountain", shapes: [
    { kind: "circle", cx: 0.7, cy: 0.26, r: 0.11 },
    { kind: "tri", cx: 0.36, cy: 0.62, r: 0.36 },
    { kind: "tri", cx: 0.66, cy: 0.66, r: 0.28 },
    { kind: "bar", cx: 0.5, cy: 0.84, w: 1.1, h: 0.03 },
  ] },
  { name: "tangent", shapes: [
    { kind: "ring", cx: 0.32, cy: 0.32, r: 0.34, w: 0.02 },
    { kind: "circle", cx: 0.32, cy: 0.32, r: 0.24 },
    { kind: "circle", cx: 0.66, cy: 0.62, r: 0.2 },
    { kind: "circle", cx: 0.8, cy: 0.84, r: 0.08 },
  ] },
  { name: "dots and giant", shapes: [
    { kind: "circle", cx: 0.5, cy: 0.5, r: 0.46 },
    { kind: "circle", cx: 0.12, cy: 0.1, r: 0.05 },
    { kind: "circle", cx: 0.88, cy: 0.1, r: 0.05 },
    { kind: "circle", cx: 0.88, cy: 0.9, r: 0.05 },
    { kind: "circle", cx: 0.12, cy: 0.9, r: 0.05 },
  ] },
  { name: "split half", shapes: [
    { kind: "bar", cx: 0.25, cy: 0.5, w: 0.5, h: 1.1 },
    { kind: "circle", cx: 0.5, cy: 0.5, r: 0.22 },
    { kind: "semi", cx: 0.75, cy: 0.8, r: 0.2, rot: Math.PI },
    { kind: "bar", cx: 0.75, cy: 0.2, w: 0.3, h: 0.03 },
  ] },
  { name: "orbit", shapes: [
    { kind: "ring", cx: 0.5, cy: 0.5, r: 0.4, w: 0.015 },
    { kind: "circle", cx: 0.5, cy: 0.5, r: 0.18 },
    { kind: "circle", cx: 0.9, cy: 0.5, r: 0.07 },
    { kind: "bar", cx: 0.5, cy: 0.5, w: 1.3, h: 0.015, rot: Math.PI / 4 },
  ] },
];

export const RULE_COUNT = RULES.length;
export const SLOT_COUNT = 8;
export const BAUHAUS_DRAWS = 1 + SLOT_COUNT * 4 + 6 + SLOT_COUNT * 4;

export function planBauhaus(rng) {
  const rule = rangeInt(rng, 0, RULE_COUNT - 1);
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    slots.push({
      jx: range(rng, -0.03, 0.03), jy: range(rng, -0.03, 0.03),
      scale: range(rng, 0.85, 1.15), colorIdx: rangeInt(rng, 0, 4),
    });
  }
  const edge = pick(rng, ["left", "right"]);
  const flipX = chance(rng, 0.5);
  const flipY = chance(rng, 0.3);
  const weight = pick(rng, [700, 800, 900]);
  const overlay = chance(rng, 0.3);
  const overlayRule = rangeInt(rng, 0, RULE_COUNT - 1);
  const overlaySlots = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    overlaySlots.push({
      jx: range(rng, -0.03, 0.03), jy: range(rng, -0.03, 0.03),
      scale: range(rng, 0.85, 1.15), colorIdx: rangeInt(rng, 0, 4),
    });
  }
  return { rule, slots, edge, flipX, flipY, weight, overlay, overlayRule, overlaySlots };
}

function concrete(shape, slot, W, H, k = 1, center = 0) {
  // `k` scales about the page centre for overlay rules; `center` = 0 for the main rule.
  const cx = (center + (shape.cx - center) * k) + slot.jx;
  const cy = (center + (shape.cy - center) * k) + slot.jy;
  const s = slot.scale * k;
  return {
    kind: shape.kind,
    x: cx * W,
    y: cy * H,
    r: (shape.r || 0) * W * s,
    w: (shape.w || 0) * W * s,
    h: (shape.h || 0) * H * s,
    rot: shape.rot || 0,
    span: shape.span || Math.PI * 2,
    colorIdx: slot.colorIdx,
  };
}

/** Concrete shapes in poster units, in painting order (main rule, then overlay). */
export function resolveShapes(plan, W = 1200, H = 1600) {
  const out = RULES[plan.rule].shapes.map((shape, i) => concrete(shape, plan.slots[i], W, H));
  if (plan.overlay) {
    RULES[plan.overlayRule].shapes.forEach((shape, i) => {
      out.push(concrete(shape, plan.overlaySlots[i], W, H, 0.5, 0.5));
    });
  }
  return out;
}

/** Flat shapes multiply on light paper and screen on dark paper. */
export function blendForBg(bg) {
  return isDark(bg) ? "screen" : "multiply";
}
