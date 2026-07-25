/* effectRegistry.js — pure metadata for the switchable hover effects.
 * The dropdown builds from EFFECTS; the renderer keys programs off
 * fragKey. Order here is display order.
 */

export const EFFECTS = [
  { id: "ripple", label: "Ripple", fragKey: "ripple" },
];

export const DEFAULT_EFFECT = "ripple";

export function resolveEffect(id) {
  return EFFECTS.some((e) => e.id === id) ? id : DEFAULT_EFFECT;
}
