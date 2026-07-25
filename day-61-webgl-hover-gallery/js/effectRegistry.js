/* effectRegistry.js — pure metadata for the switchable hover effects.
 * The dropdown builds from EFFECTS; the renderer keys programs off
 * fragKey. Order here is display order.
 */

export const EFFECTS = [
  { id: "ripple", label: "Ripple", fragKey: "ripple" },
  { id: "flow-rgb", label: "Flow RGB", fragKey: "flow-rgb" },
];

/* flow-rgb while it is the newest effect — the switcher commit
 * settles this back to ripple */
export const DEFAULT_EFFECT = "flow-rgb";

export function resolveEffect(id) {
  return EFFECTS.some((e) => e.id === id) ? id : DEFAULT_EFFECT;
}
