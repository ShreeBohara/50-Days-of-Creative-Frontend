// Typography helpers shared by every poster system. All sizes are in poster
// units (the 1200×1600 virtual page); the canvas transform turns them into
// pixels, and measureText ignores that transform, so fitting is scale-free.

export const DISPLAY_FAMILY = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
export const MONO_FAMILY = '"Red Hat Mono", "SF Mono", Menlo, monospace';

export function font(weight, size, family = DISPLAY_FAMILY) {
  return `${weight} ${size}px ${family}`;
}

/**
 * Largest font size at which `str` fits `maxWidth`. One measurement at 100px,
 * scaled linearly — glyph advance is linear in size for outline fonts.
 * `tracking` is extra letter spacing as a fraction of the font size.
 */
export function fitFontSize(ctx, str, {
  weight = 800, family = DISPLAY_FAMILY, maxWidth, maxSize = 520, minSize = 24, tracking = 0,
}) {
  if (!str) return minSize;
  ctx.font = font(weight, 100, family);
  const gaps = Math.max(0, str.length - 1);
  const width100 = ctx.measureText(str).width + tracking * 100 * gaps;
  if (!(width100 > 0)) return minSize;
  const size = (maxWidth / width100) * 100;
  return Math.max(minSize, Math.min(maxSize, size));
}

/**
 * Breaks a headline into up to `lines` lines. Words are distributed so the
 * character counts balance; a single long word is split in half (and again)
 * so one-word headlines like VOLTAGE can still stack — VOL / TAGE.
 * Pure: safe to call from plan() and from tests.
 */
export function breakHeadline(str, lines = 1) {
  const text = String(str ?? "").trim().replace(/\s+/g, " ");
  if (!text) return [];
  const target = Math.max(1, Math.floor(lines));
  let parts = text.split(" ").map((word) => ({ text: word, glue: true }));

  while (parts.length < target) {
    let longest = 0;
    for (let i = 1; i < parts.length; i += 1) {
      if (parts[i].text.length > parts[longest].text.length) longest = i;
    }
    const part = parts[longest];
    if (part.text.length < 4) break;
    const cut = Math.ceil(part.text.length / 2);
    parts.splice(longest, 1,
      { text: part.text.slice(0, cut), glue: part.glue },
      { text: part.text.slice(cut), glue: false });
  }

  const total = parts.reduce((sum, part) => sum + part.text.length, 0);
  const per = total / target;
  const grouped = [];
  let current = [];
  let consumed = 0;
  for (const part of parts) {
    // Break before this part if its midpoint lands past the balance point.
    const overflow = consumed + part.text.length / 2 > per * (grouped.length + 1);
    if (current.length && grouped.length < target - 1 && overflow) {
      grouped.push(current);
      current = [];
    }
    current.push(part);
    consumed += part.text.length;
  }
  if (current.length) grouped.push(current);
  return grouped.map((group) =>
    group.map((part, i) => (i > 0 && part.glue ? " " : "") + part.text).join(""));
}

/** Width of `str` with `tracking` poster units between glyphs. */
export function measureTracked(ctx, str, tracking = 0) {
  let width = 0;
  let count = 0;
  for (const ch of str) {
    width += ctx.measureText(ch).width;
    count += 1;
  }
  return width + Math.max(0, count - 1) * tracking;
}

/** Draws `str` glyph by glyph with `tracking` units between them. Returns width. */
export function drawTracked(ctx, str, x, y, tracking = 0, align = "left") {
  const width = measureTracked(ctx, str, tracking);
  let cursor = x;
  if (align === "right") cursor = x - width;
  else if (align === "center") cursor = x - width / 2;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of str) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = previousAlign;
  return width;
}

/** Filename-safe slug: "Night Shift 2026" → "night-shift-2026". */
export function slugify(str, max = 32) {
  return String(str ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "") || "poster";
}
