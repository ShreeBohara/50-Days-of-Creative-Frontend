/* VOID POST — the twenty postcards.
   Every artwork is generated SVG: a seeded scene motif drawn on a navy sky,
   wrapped in postcard chrome (frame, number, stamp, postmark, caption).
   All DOM is built with createElementNS. */

const SVG_NS = "http://www.w3.org/2000/svg";

export const CARD_W = 340;
export const CARD_H = 440;
export const CARD_COUNT = 20;

/* Inner scene window (inside the postcard frame) */
const SC = { x: 20, y: 20, w: 300, h: 310 };

/* ---------- tiny helpers ---------- */

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
}

function add(parent, tag, attrs = {}) {
  const node = el(tag, attrs);
  parent.appendChild(node);
  return node;
}

function text(parent, str, attrs = {}) {
  const node = add(parent, "text", attrs);
  node.textContent = str;
  return node;
}

/* Deterministic PRNG so every visitor gets the same universe */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = (rng, min, max) => min + rng() * (max - min);

/* ---------- palettes (sky gradient + accent trio) ---------- */

const PALETTES = [
  { skyA: "#0b1338", skyB: "#05081a", glow: "#86e7ff", pop: "#ff8ad8", dim: "#33417f" },
  { skyA: "#150a36", skyB: "#070518", glow: "#a08bff", pop: "#ffd479", dim: "#43317c" },
  { skyA: "#04262c", skyB: "#031120", glow: "#7df0c8", pop: "#86e7ff", dim: "#1c5c58" },
  { skyA: "#260c2e", skyB: "#0b0619", glow: "#ff8ad8", pop: "#7df0c8", dim: "#67295e" },
  { skyA: "#231607", skyB: "#0b0a1c", glow: "#ffd479", pop: "#ff8ad8", dim: "#6b4b26" },
];

/* ---------- scene furniture ---------- */

function stars(g, rng, p, n) {
  for (let i = 0; i < n; i++) {
    const big = rng() > 0.85;
    add(g, "circle", {
      cx: rand(rng, SC.x + 6, SC.x + SC.w - 6).toFixed(1),
      cy: rand(rng, SC.y + 6, SC.y + SC.h - 6).toFixed(1),
      r: big ? 1.6 : rand(rng, 0.5, 1),
      fill: big ? p.glow : "#cfd8ff",
      opacity: big ? 0.9 : rand(rng, 0.25, 0.7).toFixed(2),
    });
  }
}

/* ---------- the ten motifs ---------- */

function planetRise(g, rng, p, uid) {
  stars(g, rng, p, 26);
  const defs = add(g, "defs");
  const grad = add(defs, "radialGradient", { id: `${uid}-pl`, cx: "35%", cy: "30%", r: "80%" });
  add(grad, "stop", { offset: "0%", "stop-color": p.pop, "stop-opacity": 0.9 });
  add(grad, "stop", { offset: "100%", "stop-color": p.dim });
  const r = rand(rng, 170, 220);
  add(g, "circle", { cx: SC.x + SC.w / 2, cy: SC.y + SC.h + r * 0.55, r, fill: `url(#${uid}-pl)` });
  add(g, "circle", {
    cx: SC.x + SC.w / 2, cy: SC.y + SC.h + r * 0.55, r: r + 10,
    fill: "none", stroke: p.glow, "stroke-width": 0.8, opacity: 0.5,
  });
  add(g, "circle", { cx: rand(rng, 60, 260), cy: rand(rng, 60, 130), r: rand(rng, 9, 14), fill: p.glow, opacity: 0.9 });
}

function ringworld(g, rng, p, uid) {
  stars(g, rng, p, 22);
  const cx = SC.x + SC.w / 2, cy = SC.y + SC.h * 0.46;
  const tilt = rand(rng, -22, -10).toFixed(1);
  add(g, "circle", { cx, cy, r: 58, fill: p.dim });
  add(g, "circle", { cx: cx - 16, cy: cy - 18, r: 58, fill: p.pop, opacity: 0.25 });
  for (let i = 0; i < 4; i++) {
    add(g, "ellipse", {
      cx, cy, rx: 92 + i * 16, ry: 26 + i * 5,
      fill: "none", stroke: i === 1 ? p.pop : p.glow,
      "stroke-width": i === 1 ? 2 : 0.8,
      "stroke-dasharray": i % 2 ? "1 6" : "none",
      opacity: (0.85 - i * 0.16).toFixed(2),
      transform: `rotate(${tilt} ${cx} ${cy})`,
    });
  }
}

function cometTrail(g, rng, p) {
  stars(g, rng, p, 30);
  const x0 = SC.x + SC.w * 0.82, y0 = SC.y + SC.h * 0.24;
  for (let i = 0; i < 7; i++) {
    const spread = i * rand(rng, 5, 8), len = 150 + i * 14;
    add(g, "line", {
      x1: x0 - spread * 0.4, y1: y0 + spread,
      x2: x0 - len, y2: y0 + spread + len * 0.55,
      stroke: i < 2 ? p.pop : p.glow, "stroke-width": i < 2 ? 1.6 : 0.7,
      "stroke-linecap": "round", opacity: (0.9 - i * 0.11).toFixed(2),
    });
  }
  add(g, "circle", { cx: x0, cy: y0, r: 7, fill: "#fff" });
  add(g, "circle", { cx: x0, cy: y0, r: 12, fill: "none", stroke: p.pop, "stroke-width": 1, opacity: 0.7 });
}

function constellation(g, rng, p) {
  stars(g, rng, p, 16);
  const pts = [];
  for (let i = 0; i < 8; i++) {
    pts.push([rand(rng, SC.x + 30, SC.x + SC.w - 30), rand(rng, SC.y + 34, SC.y + SC.h - 40)]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    add(g, "line", {
      x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1],
      stroke: p.glow, "stroke-width": 0.7, opacity: 0.55, "stroke-dasharray": "3 4",
    });
  }
  pts.forEach(([x, y], i) => {
    add(g, "circle", { cx: x, cy: y, r: i % 3 ? 2.2 : 3.4, fill: i % 3 ? "#fff" : p.pop });
    add(g, "circle", { cx: x, cy: y, r: 6.5, fill: "none", stroke: p.glow, "stroke-width": 0.5, opacity: 0.5 });
  });
}

function duneRidges(g, rng, p) {
  stars(g, rng, p, 14);
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const base = SC.y + SC.h * (0.45 + i * 0.13);
    let d = `M ${SC.x} ${base}`;
    for (let x = 0; x <= SC.w; x += 30) {
      const y = base + Math.sin((x / SC.w) * Math.PI * rand(rng, 1.6, 3.2) + i * 1.7) * rand(rng, 10, 26);
      d += ` L ${SC.x + x} ${y.toFixed(1)}`;
    }
    d += ` L ${SC.x + SC.w} ${SC.y + SC.h} L ${SC.x} ${SC.y + SC.h} Z`;
    add(g, "path", {
      d, fill: i === 0 ? p.dim : "#070b22",
      stroke: p.glow, "stroke-width": i === layers - 1 ? 1.4 : 0.6,
      opacity: (0.55 + i * 0.11).toFixed(2),
    });
  }
  add(g, "circle", { cx: rand(rng, 70, 260), cy: SC.y + 66, r: 13, fill: p.pop, opacity: 0.85 });
}

function pulsar(g, rng, p) {
  const cx = SC.x + SC.w / 2, cy = SC.y + SC.h * 0.44;
  stars(g, rng, p, 20);
  const beams = 12;
  for (let i = 0; i < beams; i++) {
    const a = (i / beams) * Math.PI * 2 + rand(rng, -0.06, 0.06);
    const len = i % 2 ? rand(rng, 46, 66) : rand(rng, 96, 128);
    add(g, "line", {
      x1: cx + Math.cos(a) * 14, y1: cy + Math.sin(a) * 14,
      x2: cx + Math.cos(a) * len, y2: cy + Math.sin(a) * len,
      stroke: i % 2 ? p.glow : p.pop, "stroke-width": i % 2 ? 0.7 : 1.4,
      "stroke-linecap": "round", opacity: i % 2 ? 0.55 : 0.9,
    });
  }
  add(g, "circle", { cx, cy, r: 9, fill: "#fff" });
  for (let i = 1; i <= 3; i++) {
    add(g, "circle", {
      cx, cy, r: 24 + i * 22, fill: "none", stroke: p.glow,
      "stroke-width": 0.6, "stroke-dasharray": "2 8", opacity: (0.65 - i * 0.15).toFixed(2),
    });
  }
}

function orbitGarden(g, rng, p) {
  const cx = SC.x + SC.w / 2, cy = SC.y + SC.h * 0.5;
  stars(g, rng, p, 12);
  add(g, "circle", { cx, cy, r: 12, fill: p.pop });
  add(g, "circle", { cx, cy, r: 18, fill: "none", stroke: p.pop, "stroke-width": 0.8, opacity: 0.6 });
  for (let i = 0; i < 5; i++) {
    const r = 34 + i * 24;
    add(g, "circle", { cx, cy, r, fill: "none", stroke: p.dim, "stroke-width": 1, opacity: 0.9 });
    const a = rand(rng, 0, Math.PI * 2);
    add(g, "circle", {
      cx: cx + Math.cos(a) * r, cy: cy + Math.sin(a) * r,
      r: rand(rng, 3, 6.5), fill: i % 2 ? p.glow : "#fff",
    });
  }
}

function moonPhases(g, rng, p, uid) {
  stars(g, rng, p, 22);
  const n = 4, r = 26;
  for (let i = 0; i < n; i++) {
    const cx = SC.x + 62 + i * ((SC.w - 124) / (n - 1));
    const cy = SC.y + SC.h * 0.34 + (i % 2 ? 44 : -12);
    const clipId = `${uid}-m${i}`;
    const clip = add(add(g, "defs"), "clipPath", { id: clipId });
    add(clip, "circle", { cx, cy, r });
    add(g, "circle", { cx, cy, r, fill: p.dim });
    add(g, "circle", { cx: cx + (i - 1.5) * 14, cy, r, fill: p.glow, "clip-path": `url(#${clipId})`, opacity: 0.9 });
    add(g, "circle", { cx, cy, r, fill: "none", stroke: p.glow, "stroke-width": 0.7, opacity: 0.6 });
  }
  add(g, "line", {
    x1: SC.x + 30, y1: SC.y + SC.h * 0.72, x2: SC.x + SC.w - 30, y2: SC.y + SC.h * 0.72,
    stroke: p.pop, "stroke-width": 1, "stroke-dasharray": "1 6", opacity: 0.8,
  });
}

function beaconTower(g, rng, p) {
  stars(g, rng, p, 18);
  const bx = SC.x + SC.w * 0.5, base = SC.y + SC.h, top = SC.y + SC.h * 0.3;
  add(g, "polygon", {
    points: `${bx - 34},${base} ${bx + 34},${base} ${bx + 6},${top} ${bx - 6},${top}`,
    fill: "none", stroke: p.glow, "stroke-width": 1.2,
  });
  for (let i = 1; i < 5; i++) {
    const y = base - (base - top) * (i / 5);
    const half = 34 - 28 * (i / 5);
    add(g, "line", { x1: bx - half, y1: y, x2: bx + half, y2: y, stroke: p.dim, "stroke-width": 1 });
    add(g, "line", { x1: bx - half, y1: y, x2: bx + (34 - 28 * ((i - 1) / 5)), y2: base - (base - top) * ((i - 1) / 5), stroke: p.dim, "stroke-width": 0.7, opacity: 0.8 });
  }
  add(g, "circle", { cx: bx, cy: top - 8, r: 5, fill: p.pop });
  for (let i = 1; i <= 3; i++) {
    add(g, "path", {
      d: `M ${bx - i * 16} ${top - 8 - i * 10} Q ${bx} ${top - 22 - i * 16} ${bx + i * 16} ${top - 8 - i * 10}`,
      fill: "none", stroke: p.pop, "stroke-width": 1, opacity: (0.9 - i * 0.22).toFixed(2),
    });
  }
}

function nebulaBloom(g, rng, p, uid) {
  const defs = add(g, "defs");
  const blur = add(defs, "filter", { id: `${uid}-nb`, x: "-40%", y: "-40%", width: "180%", height: "180%" });
  add(blur, "feGaussianBlur", { stdDeviation: 14 });
  const cluster = add(g, "g", { filter: `url(#${uid}-nb)` });
  for (let i = 0; i < 6; i++) {
    add(cluster, "ellipse", {
      cx: rand(rng, SC.x + 80, SC.x + SC.w - 80),
      cy: rand(rng, SC.y + 80, SC.y + SC.h - 90),
      rx: rand(rng, 34, 70), ry: rand(rng, 24, 52),
      fill: [p.glow, p.pop, p.dim][i % 3],
      opacity: rand(rng, 0.18, 0.4).toFixed(2),
      transform: `rotate(${rand(rng, -40, 40).toFixed(0)} ${SC.x + SC.w / 2} ${SC.y + SC.h / 2})`,
    });
  }
  stars(g, rng, p, 34);
}

const MOTIFS = [
  planetRise, ringworld, cometTrail, constellation, duneRidges,
  pulsar, orbitGarden, moonPhases, beaconTower, nebulaBloom,
];

/* ---------- the twenty sectors ---------- */

export const CARDS = [
  { name: "PALE HARBOR" },      { name: "THE ANNULUS" },
  { name: "LONG GOODBYE" },     { name: "FALSE MAP" },
  { name: "DUNES OF STATIC" },  { name: "LIGHTHOUSE 9" },
  { name: "CLOCKWORK GARDEN" }, { name: "FOUR QUIET MOONS" },
  { name: "LAST TRANSMITTER" }, { name: "MILK OF THE VOID" },
  { name: "RED SHALLOWS" },     { name: "BROKEN HALO" },
  { name: "COURIER 12" },       { name: "NORTH OF NOWHERE" },
  { name: "GLASS STEPPE" },     { name: "METRONOME" },
  { name: "TIDAL LEDGER" },     { name: "ECLIPSE DRILL" },
  { name: "QUIET ANTENNA" },    { name: "TERMINUS BLOOM" },
];

/* Fake survey coordinates, deterministic per card */
export function cardCoords(index) {
  const rng = mulberry32(index * 7919 + 353);
  const lat = (rand(rng, -89, 89)).toFixed(1);
  const lon = (rand(rng, -179, 179)).toFixed(1);
  return `${Math.abs(lat)}°${lat >= 0 ? "N" : "S"} · ${Math.abs(lon)}°${lon >= 0 ? "E" : "W"}`;
}

/* ---------- postcard assembly ---------- */

let instanceCounter = 0;

export function buildPostcardSVG(index) {
  const meta = CARDS[index];
  const palette = PALETTES[index % PALETTES.length];
  const rng = mulberry32(index * 7919 + 29);
  const uid = `vp${index}i${instanceCounter++}`; // unique ids even across pool duplicates
  const num = String(index + 1).padStart(2, "0");

  const svg = el("svg", {
    viewBox: `0 0 ${CARD_W} ${CARD_H}`,
    class: "postcard-art",
    role: "img",
    "aria-label": `Postcard ${num} — ${meta.name}`,
  });

  /* sky */
  const defs = add(svg, "defs");
  const sky = add(defs, "linearGradient", { id: `${uid}-sky`, x1: "0", y1: "0", x2: "0", y2: "1" });
  add(sky, "stop", { offset: "0%", "stop-color": palette.skyA });
  add(sky, "stop", { offset: "100%", "stop-color": palette.skyB });
  const clip = add(defs, "clipPath", { id: `${uid}-win` });
  add(clip, "rect", { x: SC.x, y: SC.y, width: SC.w, height: SC.h, rx: 6 });

  add(svg, "rect", { x: 0.5, y: 0.5, width: CARD_W - 1, height: CARD_H - 1, rx: 12, fill: "#0a1030" });
  add(svg, "rect", { x: SC.x, y: SC.y, width: SC.w, height: SC.h, rx: 6, fill: `url(#${uid}-sky)` });

  /* scene */
  const scene = add(svg, "g", { "clip-path": `url(#${uid}-win)` });
  MOTIFS[index % MOTIFS.length](scene, rng, palette, uid);

  /* scene window edge */
  add(svg, "rect", {
    x: SC.x, y: SC.y, width: SC.w, height: SC.h, rx: 6,
    fill: "none", stroke: "rgba(134,231,255,0.35)", "stroke-width": 1,
  });

  /* stamp (top-right, perforated) + postmark cancellation */
  const st = { x: CARD_W - 76, y: 34, w: 44, h: 54 };
  add(svg, "rect", {
    x: st.x, y: st.y, width: st.w, height: st.h,
    fill: "rgba(5,8,26,0.55)", stroke: palette.pop,
    "stroke-width": 1, "stroke-dasharray": "2 3",
  });
  add(svg, "circle", { cx: st.x + st.w / 2, cy: st.y + 22, r: 10, fill: "none", stroke: palette.glow, "stroke-width": 1 });
  add(svg, "circle", { cx: st.x + st.w / 2, cy: st.y + 22, r: 3.4, fill: palette.pop });
  text(svg, "VP-52", {
    x: st.x + st.w / 2, y: st.y + st.h - 9, "text-anchor": "middle",
    "font-family": "Martian Mono, monospace", "font-size": 7, fill: palette.glow, opacity: 0.9,
  });
  add(svg, "circle", {
    cx: st.x - 8, cy: st.y + st.h - 6, r: 17,
    fill: "none", stroke: "rgba(233,237,255,0.4)", "stroke-width": 1, "stroke-dasharray": "3 3",
  });
  for (let i = 0; i < 3; i++) {
    add(svg, "path", {
      d: `M ${st.x - 34} ${st.y + st.h + 2 + i * 5} q 10 -4 20 0 t 20 0`,
      fill: "none", stroke: "rgba(233,237,255,0.35)", "stroke-width": 1,
    });
  }

  /* big number, ghosted over the scene bottom */
  text(svg, num, {
    x: SC.x + 8, y: SC.y + SC.h - 14,
    "font-family": "Syne, sans-serif", "font-size": 74, "font-weight": 800,
    fill: "none", stroke: palette.glow, "stroke-width": 1.1, opacity: 0.85,
  });

  /* caption band */
  add(svg, "line", {
    x1: 20, y1: CARD_H - 84, x2: CARD_W - 20, y2: CARD_H - 84,
    stroke: "rgba(134,231,255,0.25)", "stroke-width": 1,
  });
  text(svg, meta.name, {
    x: 20, y: CARD_H - 56,
    "font-family": "Syne, sans-serif", "font-size": 19, "font-weight": 700,
    "letter-spacing": "1.5", fill: "#e9edff",
  });
  text(svg, `SECTOR ${num} · ${cardCoords(index)}`, {
    x: 20, y: CARD_H - 32,
    "font-family": "Martian Mono, monospace", "font-size": 8.5,
    fill: "#8a93c4", "letter-spacing": "0.5",
  });
  text(svg, "VOID POST", {
    x: CARD_W - 20, y: CARD_H - 32, "text-anchor": "end",
    "font-family": "Martian Mono, monospace", "font-size": 8.5,
    fill: palette.pop, "letter-spacing": "2",
  });

  return svg;
}
