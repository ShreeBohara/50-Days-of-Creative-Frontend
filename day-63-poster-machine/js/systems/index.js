// Registry of poster systems.
//
// A system is { id, code, name, salt, plan(rng, text) -> plan, draw(ctx, frame, plan) }.
// `plan` is the ONLY place a system may draw random numbers, and it must draw
// the same number of them regardless of text, palette or resolution — that is
// what keeps a seed code reproducible everywhere (display, minis, export).
// `draw` is pure canvas work in 1200×1600 poster units; poster.js sets the
// transform, so systems never think about pixels.
import { swiss } from "./swiss.js";

export const SYSTEMS = [swiss];
export const DEFAULT_SYSTEM = SYSTEMS[0].id;
export const SYSTEM_IDS = SYSTEMS.map((system) => system.id);

export function getSystem(id) {
  return SYSTEMS.find((system) => system.id === id) || SYSTEMS[0];
}
