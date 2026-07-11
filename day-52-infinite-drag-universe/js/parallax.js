/* VOID POST — parallax depth layer.
   A seeded starfield pattern sits behind the postcards and moves at 0.6x
   the world offset, wrapped at its own tile size, so the void itself has
   depth. The pattern is one generated SVG data-URI on a translated sheet
   (compositor-friendly: transform only, never background-position). */

const PATTERN = 760;   // px, one repeat of the starfield
const DEPTH = 0.6;     // parallax factor vs the card field

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starfieldURI() {
  const rng = mulberry32(52 * 7919);
  const bits = [`<svg xmlns="http://www.w3.org/2000/svg" width="${PATTERN}" height="${PATTERN}">`];
  // dust
  for (let i = 0; i < 46; i++) {
    const x = (rng() * PATTERN).toFixed(1);
    const y = (rng() * PATTERN).toFixed(1);
    const r = (0.5 + rng() * 1.1).toFixed(2);
    const o = (0.12 + rng() * 0.4).toFixed(2);
    bits.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#aebbff" opacity="${o}"/>`);
  }
  // a few brighter beacons with a cross glint
  for (let i = 0; i < 5; i++) {
    const x = (rng() * PATTERN).toFixed(1);
    const y = (rng() * PATTERN).toFixed(1);
    const hue = ["#86e7ff", "#ff8ad8", "#ffd479"][i % 3];
    bits.push(`<circle cx="${x}" cy="${y}" r="1.7" fill="${hue}" opacity="0.8"/>`);
    bits.push(`<line x1="${x - 6}" y1="${y}" x2="${+x + 6}" y2="${y}" stroke="${hue}" stroke-width="0.5" opacity="0.4"/>`);
    bits.push(`<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${+y + 6}" stroke="${hue}" stroke-width="0.5" opacity="0.4"/>`);
  }
  // one faint survey ring per tile, for flavor
  bits.push(`<circle cx="${(rng() * PATTERN).toFixed(1)}" cy="${(rng() * PATTERN).toFixed(1)}" r="54" fill="none" stroke="#33417f" stroke-width="0.6" stroke-dasharray="2 7" opacity="0.5"/>`);
  bits.push("</svg>");
  return `url("data:image/svg+xml,${encodeURIComponent(bits.join(""))}")`;
}

export function createParallax({ engine, layer }) {
  const sheet = document.createElement("div");
  sheet.className = "parallax-sheet";
  sheet.style.backgroundImage = starfieldURI();
  layer.appendChild(sheet);

  const wrap = (v, size) => ((v % size) + size) % size;

  engine.onFrame((state) => {
    const x = wrap(state.x * DEPTH, PATTERN) - PATTERN;
    const y = wrap(state.y * DEPTH, PATTERN) - PATTERN;
    sheet.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  });
}
