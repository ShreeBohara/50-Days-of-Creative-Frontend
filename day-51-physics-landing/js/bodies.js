// bodies.js — the cast: 5 headline letter blocks, 4 nav pills, 6 feature cards,
// 3 decorative circles. Each gets a Matter body with tuned mass/restitution/friction
// and a paired DOM element, plus a "home" position in the proper hero layout.

const { Bodies } = window.Matter;

// Everything is authored at 1280px-wide proportions and scaled down from there.
export const scaleFor = (vw) => Math.max(0.5, Math.min(1, vw / 1180));

const LETTERS = [
  { id: "letter-h", char: "H", size: 128, tone: "red" },
  { id: "letter-e", char: "E", size: 118, tone: "paper" },
  { id: "letter-a", char: "A", size: 132, tone: "mustard" },
  { id: "letter-v", char: "V", size: 120, tone: "cobalt" },
  { id: "letter-y", char: "Y", size: 126, tone: "ink" },
];

const PILLS = [
  { id: "pill-work", label: "Work", w: 108, tone: "paper" },
  { id: "pill-about", label: "About", w: 116, tone: "paper" },
  { id: "pill-team", label: "Team", w: 104, tone: "paper" },
  { id: "pill-contact", label: "Contact", w: 138, tone: "ink" },
];
const PILL_H = 46;

const CARDS = [
  { id: "card-1", num: "01", title: "Mass", copy: "Interfaces with real inertia.", w: 216, h: 132 },
  { id: "card-2", num: "02", title: "Gravity", copy: "Layouts that know which way is down.", w: 184, h: 138 },
  { id: "card-3", num: "03", title: "Momentum", copy: "Ship fast, decelerate never.", w: 232, h: 124 },
  { id: "card-4", num: "04", title: "Friction", copy: "Just enough left in to feel it.", w: 176, h: 128 },
  { id: "card-5", num: "05", title: "Restitution", copy: "Every idea bounces back.", w: 204, h: 142 },
  { id: "card-6", num: "06", title: "Torque", copy: "Brands with serious spin.", w: 168, h: 118 },
];

const CIRCLES = [
  { id: "circle-1", d: 112, tone: "red" },
  { id: "circle-2", d: 76, tone: "cobalt" },
  { id: "circle-3", d: 52, tone: "mustard" },
];

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  node.className = className;
  for (const child of children) node.append(child);
  return node;
}

function makeLetterEl(def, size) {
  const node = el("div", `p-letter tone-${def.tone}`, [def.char]);
  node.style.fontSize = `${Math.round(size * 0.56)}px`;
  return node;
}

function makePillEl(def, s) {
  const node = el("button", `p-pill tone-${def.tone}`, [def.label]);
  node.type = "button";
  node.style.fontSize = `${Math.round(17 * s)}px`;
  return node;
}

function makeCardEl(def, s) {
  const node = el("article", "p-card", [
    el("span", "card-num", [def.num]),
    el("h2", "card-title", [def.title]),
    el("p", "card-copy", [def.copy]),
  ]);
  node.style.fontSize = `${Math.max(9, Math.round(16 * s))}px`;
  return node;
}

function makeCircleEl(def) {
  return el("div", `p-circle tone-${def.tone}`);
}

// The "proper layout" — a classic hero — doubles as the reassemble target.
export function layoutCast(items, vp) {
  const s = scaleFor(vp.w);
  const byId = new Map(items.map((item) => [item.id, item]));
  const place = (id, x, y) => {
    const item = byId.get(id);
    if (item) item.home = { x, y, angle: 0 };
  };

  // headline letters: a left-anchored row in the upper-middle
  const gap = 16 * s;
  const letterItems = LETTERS.map((d) => byId.get(d.id));
  const rowW = letterItems.reduce((acc, it) => acc + it.w, 0) + gap * 4;
  let lx = Math.max(24, Math.min(vp.w * 0.1, vp.w / 2 - rowW / 2));
  const ly = vp.h * 0.36;
  for (const item of letterItems) {
    place(item.id, lx + item.w / 2, ly);
    lx += item.w + gap;
  }

  // nav pills: a row hugging the top-right corner
  const pillGap = 12 * s;
  const pillItems = PILLS.map((d) => byId.get(d.id));
  let px = vp.w - 24;
  for (const item of [...pillItems].reverse()) {
    place(item.id, px - item.w / 2, 24 + item.h / 2);
    px -= item.w + pillGap;
  }

  // feature cards: 3x2 grid below the headline (2x3 on narrow screens)
  const cols = vp.w < 640 ? 2 : 3;
  const colGap = (vp.w < 640 ? vp.w * 0.47 : 258 * s);
  const rowGap = vp.w < 640 ? 118 * s + 24 : 152 * s;
  const cardItems = CARDS.map((d) => byId.get(d.id));
  const gridY = vp.h * (vp.w < 640 ? 0.6 : 0.66);
  cardItems.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = vp.w / 2 + (col - (cols - 1) / 2) * colGap;
    place(item.id, cx, gridY + row * rowGap);
  });

  // decorative circles: asymmetric accents
  place("circle-1", vp.w * 0.86, vp.h * 0.3);
  place("circle-2", vp.w * 0.77, vp.h * 0.14);
  place("circle-3", vp.w * 0.08, vp.h * 0.8);
}

export function createCast(vp) {
  const s = scaleFor(vp.w);
  const items = [];

  for (const def of LETTERS) {
    const size = Math.round(def.size * s);
    items.push({
      id: def.id,
      kind: "letter",
      w: size,
      h: size,
      el: makeLetterEl(def, size),
      bodyOpts: {
        restitution: 0.32,
        friction: 0.4,
        frictionAir: 0.012,
        density: 0.0012,
        chamfer: { radius: Math.round(18 * s) },
      },
    });
  }

  for (const def of PILLS) {
    const w = Math.round(def.w * s);
    const h = Math.round(PILL_H * s);
    items.push({
      id: def.id,
      kind: "pill",
      w,
      h,
      el: makePillEl(def, s),
      bodyOpts: {
        restitution: 0.55,
        friction: 0.25,
        frictionAir: 0.015,
        density: 0.0008,
        chamfer: { radius: h / 2 - 1 },
      },
    });
  }

  for (const def of CARDS) {
    items.push({
      id: def.id,
      kind: "card",
      w: Math.round(def.w * s),
      h: Math.round(def.h * s),
      el: makeCardEl(def, s),
      bodyOpts: {
        restitution: 0.22,
        friction: 0.5,
        frictionAir: 0.014,
        density: 0.0009,
        chamfer: { radius: Math.round(13 * s) },
      },
    });
  }

  for (const def of CIRCLES) {
    const d = Math.round(def.d * s);
    items.push({
      id: def.id,
      kind: "circle",
      w: d,
      h: d,
      r: d / 2,
      el: makeCircleEl(def),
      bodyOpts: {
        restitution: 0.7,
        friction: 0.08,
        frictionAir: 0.008,
        density: 0.001,
      },
    });
  }

  layoutCast(items, vp);

  for (const item of items) {
    const { x, y } = item.home;
    item.body =
      item.kind === "circle"
        ? Bodies.circle(x, y, item.r, item.bodyOpts)
        : Bodies.rectangle(x, y, item.w, item.h, item.bodyOpts);
    item.el.dataset.id = item.id;
  }

  return items;
}
