// ============================================================
// Contrast — WCAG 2.x relative luminance and contrast ratio.
//
// Used by the tests to pin the palette tokens: body text on the
// dark lacquer ground must clear AAA (7:1), the muted and gold
// accents must clear AA (4.5:1).
// ============================================================

function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) throw new TypeError(`contrast: not a hex colour: ${hex}`)
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}

// sRGB transfer curve undone, per WCAG's definition.
const linear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Always ≥ 1: the lighter colour goes on top, whatever the order.
export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
