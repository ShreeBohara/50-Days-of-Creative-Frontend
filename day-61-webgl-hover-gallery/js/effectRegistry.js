/* effectRegistry.js — pure metadata for the switchable hover effects.
 * The dropdown builds from EFFECTS; the renderer keys programs off
 * fragKey. Order here is display order.
 */

export const EFFECTS = [
  { id: "ripple", label: "Ripple", fragKey: "ripple" },
  { id: "flow-rgb", label: "Flow RGB", fragKey: "flow-rgb" },
  { id: "pixelate", label: "Pixelate", fragKey: "pixelate", hasInvert: true },
  { id: "melt", label: "Melt", fragKey: "melt" },
];

export const DEFAULT_EFFECT = "ripple";

export function resolveEffect(id) {
  return EFFECTS.some((e) => e.id === id) ? id : DEFAULT_EFFECT;
}
