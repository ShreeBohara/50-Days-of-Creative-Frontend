// Chapter IX — Print & Craft. The last room before the end of the book is a
// museum of making. Across the gutter: the portico of Musée Zéro (day 49)
// with exhibition banners for the Dither Lab (48) and the Poster Machine (63),
// a die-cut zero for its oculus and a Y2K sticker (59) slapped on a column;
// in front, the kintsugi tea bowl (64) as the exhibit on a floating plinth;
// in the foreground a velvet rope that says PLEASE TOUCH. On the left page a
// poster press prints a new poster from a seed as its dial turns; on the
// right a shoebox lid lifts to pop up the day-22 sneaker, and one line draws
// itself across the foot of the page (day 11).

import { trace } from "../art/trace.js";
import { W } from "../paper/dims.js";
import { roundRect } from "../paper/polygon.js";
import { CHAPTERS, folios } from "./chapters.js";
import { M, dayIndex, folio, runningHead, starburst } from "./furniture.js";

const CH = CHAPTERS[8];
const [pl, pr] = folios(9);
const GOLD = "gold";
const INK = "black";
const RED = "red";
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ helpers

/** One line of type straight onto a ctx (for rotated / mirrored frames). */
function ctxText(ctx, g, str, x, y, o = {}) {
  const {
    kind = "serif",
    size = 0.5,
    weight = 400,
    italic = false,
    align = "left",
    tracking = 0,
    tone = 1,
  } = o;
  ctx.save();
  ctx.fillStyle = g.tone(tone);
  ctx.translate(x, y);
  ctx.scale(0.01, 0.01);
  ctx.font = g.font(kind, size * 100, { weight, italic });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const tr = tracking * size * 100;
  const chars = [...str];
  let w = 0;
  if (tr) {
    for (const ch of chars) w += ctx.measureText(ch).width + tr;
    w -= tr;
  } else w = ctx.measureText(str).width;
  let sx = align === "center" ? -w / 2 : align === "right" ? -w : 0;
  if (!tr) ctx.fillText(str, sx, 0);
  else {
    for (const ch of chars) {
      ctx.fillText(ch, sx, 0);
      sx += ctx.measureText(ch).width + tr;
    }
  }
  ctx.restore();
}

/**
 * A drawing kit in a local frame: m = [a, b, c, d, e, f] maps local → card
 * (as ctx.transform). Optional clip polygon in local coordinates.
 */
function frame(g, m, clip) {
  const pre = (ctx) => {
    ctx.transform(...m);
    if (clip) ctx.clip(g.path(clip));
  };
  const k = {
    ink: (name, fn) => g.ink(name, (ctx) => (pre(ctx), fn(ctx))),
    knock: (name, fn) => g.knock(name, (ctx) => (pre(ctx), fn(ctx))),
    fill: (name, shape, tone = 1) =>
      k.ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone);
        ctx.fill(Array.isArray(shape) ? g.path(shape) : shape);
      }),
    stroke: (name, shape, width = 0.05, tone = 1, closed = false) =>
      k.ink(name, (ctx) => {
        ctx.strokeStyle = g.tone(tone);
        ctx.lineWidth = width;
        ctx.stroke(Array.isArray(shape) ? g.path(shape, closed) : shape);
      }),
    circle: (name, cx, cy, r, tone = 1) =>
      k.ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
      }),
    text: (name, str, x, y, o) =>
      k.ink(name, (ctx) => ctxText(ctx, g, str, x, y, o)),
    knockText: (name, str, x, y, o) =>
      k.knock(name, (ctx) => ctxText(ctx, g, str, x, y, o)),
  };
  return k;
}

/** rotate θ (canvas sense, clockwise on the page) after translating by (tx, ty). */
const rotT = (theta, tx = 0, ty = 0) => {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, s, -s, c, c * tx - s * ty, s * tx + c * ty];
};

/** The back of a card is painted mirrored left-right about its print box. */
const mirror = (g) => [-1, 0, 0, 1, 2 * g.box.x0 + g.box.w, 0];

/** Glue edges must sit exactly on y = 0: snap the traced bottom down. */
const snapBase = (shape) => ({
  ...shape,
  outline: shape.outline.map(([x, y]) => [x, y > -0.07 ? 0 : y]),
});

/**
 * Subdivide the outline's edges above y = yTop with collinear points. The cut
 * is identical; this only lifts the vertex average the preview script sorts
 * surfaces by, so a piece standing in front of a tall backdrop draws in
 * front of it there too (the app's depth buffer needs no such help).
 */
const weightTop = (shape, yTop, k = 8) => {
  const out = [];
  const o = shape.outline;
  o.forEach((a, i) => {
    const b = o[(i + 1) % o.length];
    out.push(a);
    if (a[1] < yTop && b[1] < yTop)
      for (let j = 1; j < k; j++)
        out.push([
          a[0] + ((b[0] - a[0]) * j) / k,
          a[1] + ((b[1] - a[1]) * j) / k,
        ]);
  });
  return { ...shape, outline: out };
};

/**
 * The same trick for a backdrop, from behind: crowd the glued bottom edge
 * around the hinge point with points, so each half's vertex average sits at
 * the back of the stage, on the floor, and everything standing in front of
 * it (the bowl, the sticker on its face) sorts in front from every view.
 * The points sit a hair (1e-6 cm) above the glue line, where the panel clip
 * keeps them; the cut is unchanged.
 */
const weightHinge = (shape, w = 0.5, k = 120) => {
  const out = [];
  const o = shape.outline;
  o.forEach((a, i) => {
    const b = o[(i + 1) % o.length];
    out.push(a);
    if (a[1] === 0 && b[1] === 0 && (a[0] > 0) !== (b[0] > 0)) {
      const s = Math.sign(b[0] - a[0]);
      for (let j = 0; j <= k; j++) {
        const x = s * (-w + (2 * w * j) / k);
        if (x !== 0) out.push([x, -1e-6]);
      }
    }
  });
  return { ...shape, outline: out };
};

const box = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/** A 4×4 ordered-dither (Bayer) matrix, thresholds in (0, 1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);

// ============================================================ MUSÉE ZÉRO (49)

const DOOR = { half: 1.9, spring: -5.3, sill: -1.08 };
const OCULUS = [0, -10.85, 0.6];
const COLS = [2.75, 7.2];

function doorPath() {
  const p = new Path2D();
  p.moveTo(-DOOR.half, DOOR.sill);
  p.lineTo(-DOOR.half, DOOR.spring);
  p.arc(0, DOOR.spring, DOOR.half, Math.PI, 0);
  p.lineTo(DOOR.half, DOOR.sill);
  p.closePath();
  return p;
}

function museumSolid(ctx) {
  ctx.beginPath();
  ctx.rect(-8.2, -0.37, 16.4, 0.37);
  ctx.rect(-8.05, -0.73, 16.1, 0.38);
  ctx.rect(-7.9, -1.1, 15.8, 0.39);
  ctx.rect(-7.9, -8.32, 15.8, 7.26);
  ctx.rect(-8.35, -9.72, 16.7, 1.42);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8.6, -9.68);
  ctx.lineTo(0, -12.45);
  ctx.lineTo(8.6, -9.68);
  ctx.closePath();
  ctx.fill();
  // three acroteria: little gold flames on the pediment
  for (const [x, y] of [
    [0, -12.45],
    [-8.2, -9.75],
    [8.2, -9.75],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.32, y + 0.1);
    ctx.quadraticCurveTo(x - 0.3, y - 0.45, x, y - 0.72);
    ctx.quadraticCurveTo(x + 0.3, y - 0.45, x + 0.32, y + 0.1);
    ctx.fill();
  }
}

const museumShape = () =>
  weightHinge(
    snapBase(
    trace({ x0: -8.8, y0: -13.4, w: 17.6, h: 13.6 }, (ctx) => {
      museumSolid(ctx);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill(doorPath());
      ctx.beginPath();
      ctx.arc(OCULUS[0], OCULUS[1], OCULUS[2], 0, TAU);
      ctx.fill();
    }),
    ),
    0.3,
    400,
  );

const BANNER = { y0: -7.95, y1: -5.3, notch: 0.4 };
function bannerPoly(x0, x1) {
  const { y0, y1, notch } = BANNER;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [(x0 + x1) / 2, y1 - notch],
    [x0, y1],
  ];
}
// hung between the columns on either side of the door
const BANNER48 = bannerPoly(-6.42, -3.53);
const BANNER63 = bannerPoly(3.53, 6.42);

function museumFront(g) {
  const all = box(-9, -13.5, 9, 0.3);
  // pale stone: a light gold tint, solid gold entablature and columns
  g.fill(GOLD, all, 0.2);
  g.ink(GOLD, (ctx) => {
    ctx.fillRect(-8.4, -9.75, 16.8, 1.48);
    ctx.fillRect(-8.6, -13.5, 17.2, 0.01);
  });
  // steps
  g.fill(GOLD, box(-8.2, -0.37, 8.2, 0), 1);
  g.fill(GOLD, box(-8.05, -0.73, 8.05, -0.37), 0.75);
  g.fill(GOLD, box(-7.9, -1.1, 7.9, -0.73), 0.55);
  g.ink(INK, (ctx) => {
    ctx.lineWidth = 0.035;
    for (const [y, h] of [
      [-0.37, 8.2],
      [-0.73, 8.05],
      [-1.1, 7.9],
    ]) {
      ctx.beginPath();
      ctx.moveTo(-h, y);
      ctx.lineTo(h, y);
      ctx.stroke();
    }
  });
  // columns: knock the shade off them, gold shafts, black flutes
  for (const s of [-1, 1]) {
    for (const cx of COLS) {
      const x = cx * s;
      g.fill(GOLD, box(x - 0.43, -8.0, x + 0.43, -1.35), 1);
      g.fill(GOLD, box(x - 0.58, -8.32, x + 0.58, -8.0), 1);
      g.fill(GOLD, box(x - 0.55, -1.35, x + 0.55, -1.1), 1);
      g.ink(INK, (ctx) => {
        ctx.lineWidth = 0.03;
        ctx.strokeStyle = g.tone(0.55);
        for (const fx of [-0.24, -0.08, 0.08, 0.24]) {
          ctx.beginPath();
          ctx.moveTo(x + fx, -7.92);
          ctx.lineTo(x + fx, -1.42);
          ctx.stroke();
        }
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.04;
        ctx.strokeRect(x - 0.58, -8.32, 1.16, 0.32);
        ctx.strokeRect(x - 0.55, -1.35, 1.1, 0.25);
      });
      // a sliver of shadow down the right of each shaft
      g.fill(INK, box(x + 0.22, -8.0, x + 0.43, -1.35), 0.35);
    }
  }
  // the door: a black archivolt, a gold keystone
  g.ink(INK, (ctx) => {
    ctx.lineWidth = 0.62;
    ctx.stroke(doorPath());
  });
  g.fill(
    GOLD,
    [
      [-0.42, -7.55],
      [0.42, -7.55],
      [0.3, -7.0],
      [-0.3, -7.0],
    ],
    1,
  );
  g.knock(INK, (ctx) =>
    ctx.fill(
      g.path([
        [-0.42, -7.55],
        [0.42, -7.55],
        [0.3, -7.0],
        [-0.3, -7.0],
      ]),
    ),
  );
  g.stroke(
    INK,
    [
      [-0.42, -7.55],
      [0.42, -7.55],
      [0.3, -7.0],
      [-0.3, -7.0],
    ],
    0.04,
    1,
    true,
  );
  // entablature: architrave line, a black frieze with gold lettering
  g.fill(INK, box(-8.35, -9.42, 8.35, -8.62), 1);
  g.knock(INK, (ctx) =>
    ctxText(ctx, g, "MUSÉE  ZÉRO", 0, -8.79, {
      kind: "mono",
      size: 0.56,
      align: "center",
      tracking: 0.32,
    }),
  );
  g.ink(INK, (ctx) => {
    ctx.lineWidth = 0.04;
    ctx.strokeRect(-8.35, -8.6, 16.7, 0.28);
  });
  // pediment: raking cornice, a red ring round the die-cut zero
  g.fill(
    GOLD,
    [
      [-7.6, -9.75],
      [0, -12.05],
      [7.6, -9.75],
    ],
    0.25,
  );
  g.stroke(
    INK,
    [
      [-8.55, -9.72],
      [0, -12.4],
      [8.55, -9.72],
    ],
    0.09,
  );
  g.stroke(
    INK,
    [
      [-7.6, -9.78],
      [0, -12.05],
      [7.6, -9.78],
    ],
    0.04,
  );
  g.ink(RED, (ctx) => {
    ctx.beginPath();
    ctx.arc(OCULUS[0], OCULUS[1], OCULUS[2] + 0.28, 0, TAU);
    ctx.fill();
  });
  g.text(INK, "Nº", -1.3, -10.55, {
    kind: "display",
    size: 0.62,
    align: "right",
  });
  g.text(INK, "49", 1.3, -10.55, { kind: "display", size: 0.62 });
  // acroteria in red
  for (const [x, y] of [
    [0, -12.45],
    [-8.2, -9.75],
    [8.2, -9.75],
  ]) {
    g.ink(RED, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(x - 0.32, y + 0.1);
      ctx.quadraticCurveTo(x - 0.3, y - 0.45, x, y - 0.72);
      ctx.quadraticCurveTo(x + 0.3, y - 0.45, x + 0.32, y + 0.1);
      ctx.fill();
    });
  }
  // banners hung between the columns (each is also its own card, glued on top)
  dither48Banner(g, BANNER48);
  poster63Banner(g, BANNER63);
  g.text(INK, "EIGHT EXHIBITS · NO JAVASCRIPT", 0, -0.45, {
    kind: "mono",
    size: 0.24,
    align: "center",
    tracking: 0.12,
  });
}

function bannerRod(g, poly) {
  const [x0, y0] = poly[0];
  const x1 = poly[1][0];
  g.stroke(
    INK,
    [
      [x0 - 0.15, y0],
      [x1 + 0.15, y0],
    ],
    0.09,
  );
}

/**
 * A red exhibition banner: a solid red swallowtail on its rod, two lines of
 * lettering knocked clean out of every ink so it prints paper-white, then a
 * motif on one side and the day's number on the other.
 */
function bannerBase(g, poly, l1, l2) {
  const cx = (poly[0][0] + poly[1][0]) / 2;
  g.knock(GOLD, (ctx) => ctx.fill(g.path(poly)));
  g.fill(RED, poly);
  bannerRod(g, poly);
  const lettering = (ctx) => {
    const o = { kind: "mono", size: 0.3, align: "center", tracking: 0.1 };
    ctxText(ctx, g, l1, cx, -7.45, o);
    ctxText(ctx, g, l2, cx, -7.06, o);
  };
  for (const ink of [RED, GOLD, INK]) g.knock(ink, lettering);
  return cx;
}

/** The day's number on a banner, black on the red. */
function bannerNumber(g, n, x) {
  g.text(INK, n, x, -5.9, { kind: "display", size: 0.72, align: "center" });
}

function dither48Banner(g, poly) {
  const cx = bannerBase(g, poly, "DITHER", "LAB");
  // a sphere, ordered-dithered with a 4×4 Bayer matrix, the way day 48 did it
  const r = 0.68;
  const sx = cx - 0.6;
  const sy = -6.24;
  const cell = 0.1;
  for (const ink of [RED, GOLD])
    g.knock(ink, (ctx) => {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    });
  g.ink(INK, (ctx) => {
    for (let j = 0; j * cell < 2 * r; j++) {
      for (let i = 0; i * cell < 2 * r; i++) {
        const x = sx - r + (i + 0.5) * cell;
        const y = sy - r + (j + 0.5) * cell;
        const dx = (x - sx) / r;
        const dy = (y - sy) / r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const lit = Math.max(0, -0.55 * dx - 0.6 * dy + 0.58 * nz);
        if (lit < BAYER[(j % 4) * 4 + (i % 4)])
          ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      }
    }
  });
  bannerNumber(g, "48", cx + 0.75);
}

function poster63Banner(g, poly) {
  const cx = bannerBase(g, poly, "POSTER", "MACHINE");
  // a little poster: paper sheet, gold sun, black bars
  const px = cx + 0.6;
  const p = box(px - 0.55, -6.92, px + 0.55, -5.52);
  for (const ink of [RED, GOLD]) g.knock(ink, (ctx) => ctx.fill(g.path(p)));
  g.stroke(INK, p, 0.03, 1, true);
  g.circle(GOLD, px, -6.5, 0.3);
  g.circle(RED, px, -6.5, 0.14);
  g.fill(INK, box(px - 0.42, -6.08, px + 0.42, -5.96));
  g.fill(INK, box(px - 0.42, -5.87, px + 0.15, -5.76));
  bannerNumber(g, "63", cx - 0.72);
}

const museum = {
  id: "museum",
  kind: "vfold",
  on: "gutter",
  day: 49,
  at: 11.7,
  glue: [63, 63],
  angle: [90, 90],
  outline: museumShape,
  front: museumFront,
  back(g) {
    g.fill(GOLD, box(-9, -13.5, 9, 0.3), 0.32);
    g.ink(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.25);
      ctx.lineWidth = 0.03;
      for (let y = -0.6; y > -9.6; y -= 0.6) {
        ctx.beginPath();
        ctx.moveTo(-8, y);
        ctx.lineTo(8, y);
        ctx.stroke();
      }
    });
  },
};

// The two exhibition banners are cards of their own too, glued flat over the
// ones printed between the columns, so a tap on the 48 or the 63 opens that
// day and not the museum (49) they hang on. `at` is the museum card's origin:
// each is cut and painted in the museum's own coordinates, right over its print.
const banner48 = {
  id: "banner48",
  kind: "flat",
  on: "museum.A",
  day: 48,
  at: [0, 0],
  outline: BANNER48,
  front: (g) => dither48Banner(g, BANNER48),
  // its back only ever faces the museum: left blank
};
const banner63 = {
  id: "banner63",
  kind: "flat",
  on: "museum.B",
  day: 63,
  at: [0, 0],
  outline: BANNER63,
  front: (g) => poster63Banner(g, BANNER63),
};

// =========================================================== Y2K sticker (59)

const STK = { r: 1.9, ri: 1.5, spikes: 16 };
const burstAt = (dx, dy, k) =>
  starburst(dx, dy, STK.r * k, STK.ri * k, STK.spikes, -Math.PI / 2);
const STICKER = burstAt(0, 0, 1);
const sticker = {
  id: "sticker",
  kind: "flat",
  on: "museum.B",
  day: 59,
  // slapped across the far column, below its banner, clear of the bowl
  at: [5.9, -3.05],
  rot: -12,
  outline: STICKER,
  front(g) {
    const face = burstAt(-0.05, -0.05, 0.84);
    // chrome: the die-cut edge in solid gold with two glints wiped out of it
    g.fill(GOLD, STICKER);
    g.knock(GOLD, (ctx) => {
      ctx.rotate(-0.6);
      ctx.fillRect(-3, -1.62, 6, 0.09);
      ctx.fillRect(-3, 1.38, 6, 0.06);
    });
    // a hard black drop shadow, offset down-right
    g.fill(INK, burstAt(0.13, 0.15, 0.84));
    // the red face, clean on paper
    for (const ink of [GOLD, INK]) g.knock(ink, (ctx) => ctx.fill(g.path(face)));
    g.fill(RED, face);
    g.stroke(INK, face, 0.05, 1, true);
    for (const ink of [RED, GOLD, INK])
      g.knock(ink, (ctx) =>
        ctxText(ctx, g, "NEW!", -0.05, -0.55, {
          kind: "mono",
          size: 0.42,
          align: "center",
          tracking: 0.04,
        }),
      );
    // the number with a gold offset, the way 2001 did it
    g.text(GOLD, "59", 0.02, 0.62, { kind: "display", size: 1.18, align: "center" });
    g.knock(GOLD, (ctx) =>
      ctxText(ctx, g, "59", -0.06, 0.55, { kind: "display", size: 1.18, align: "center" }),
    );
    g.text(INK, "59", -0.06, 0.55, { kind: "display", size: 1.18, align: "center" });
    // a chrome sparkle
    g.fill(GOLD, [
      [1.0, -1.25],
      [1.1, -0.98],
      [1.37, -0.9],
      [1.1, -0.82],
      [1.0, -0.55],
      [0.9, -0.82],
      [0.63, -0.9],
      [0.9, -0.98],
    ]);
  },
  back(g) {
    g.fill(GOLD, STICKER, 0.5);
  },
};

// ====================================================== the plinth and bowl (64)

const PLINTH = { span: [14.3, 18.5], a: 3.6, b: 3.6, h: 3.0 };
// the crack across the plinth's top, X from the gutter, Y down the page: it
// leaves the bowl's foot where the bowl's own seam ends and goes over the
// front edge at X = -2.6, which the reader sees right above the floor seam's
// start (the floor under the top shows from about Y = 16.2)
const SLAB_SEAM = [
  [-1.2, 16.22],
  [-1.85, 16.6],
  [-1.6, 16.95],
  [-2.4, 17.2],
  [-2.25, 17.8],
  [-2.6, 18.5],
];
const plinth = {
  id: "plinth",
  kind: "box",
  on: "gutter",
  day: 64,
  ...PLINTH,
  front(g) {
    const { h, a, b } = PLINTH;
    const [y0, y1] = PLINTH.span;
    const L = 2 * h + a + b;
    const mid = h + a;
    // marble walls
    g.fill(GOLD, box(0, y0, L, y1), 0.28);
    g.ink(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.4);
      ctx.lineWidth = 0.025;
      for (let i = 0; i < 9; i++) {
        const sx = g.rng.range(0, L);
        ctx.beginPath();
        ctx.moveTo(sx, y0);
        let x = sx;
        for (let y = y0; y <= y1; y += 0.5) {
          x += g.rng.range(-0.35, 0.35);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
    // gold bands where the walls meet the top
    g.fill(GOLD, box(h - 0.35, y0, h, y1), 1);
    g.fill(GOLD, box(h + a + b, y0, h + a + b + 0.35, y1), 1);
    // the top: a brass slab with a black inlay, the bowl's soft shadow
    g.fill(GOLD, box(h, y0, h + a + b, y1), 0.9);
    g.stroke(
      INK,
      box(h + 0.18, y0 + 0.18, h + a + b - 0.18, y1 - 0.18),
      0.06,
      1,
      true,
    );
    g.ink(INK, (ctx) => {
      ctx.fillStyle = g.tone(0.45);
      ctx.beginPath();
      ctx.ellipse(mid, 16.6, 2.3, 0.75, 0, 0, TAU);
      ctx.fill();
    });
    // the crack runs on out of the bowl's foot, across the brass and over
    // the front edge, where the floor's main seam picks it up below: a black
    // bed so the gold reads on the brass
    const crack = SLAB_SEAM.map(([x, y]) => [mid + x, y]);
    g.knock(GOLD, (ctx) => {
      ctx.lineWidth = 0.44;
      ctx.lineJoin = "miter";
      ctx.stroke(g.path(crack, false));
    });
    g.ink(INK, (ctx) => {
      ctx.lineWidth = 0.4;
      ctx.lineJoin = "miter";
      ctx.stroke(g.path(crack, false));
    });
    g.knock(INK, (ctx) => {
      ctx.lineWidth = MAIN_SEAM;
      ctx.lineJoin = "miter";
      ctx.stroke(g.path(crack, false));
    });
    g.ink(GOLD, (ctx) => {
      ctx.lineWidth = MAIN_SEAM;
      ctx.lineJoin = "miter";
      ctx.stroke(g.path(crack, false));
    });
    // the museum label: a black plaque, its lettering knocked to paper
    const px = mid + 0.25;
    const plaque = box(px - 2.1, y1 - 1.25, px + 2.1, y1 - 0.28);
    g.knock(GOLD, (ctx) => ctx.fill(g.path(plaque)));
    g.fill(INK, plaque);
    g.knock(INK, (ctx) => {
      ctxText(ctx, g, "Nº 64 · KINTSUGI", px, y1 - 0.8, {
        kind: "mono",
        size: 0.32,
        align: "center",
        tracking: 0.1,
      });
      ctxText(ctx, g, "a tea bowl, broken & mended in gold", px, y1 - 0.45, {
        kind: "serif",
        size: 0.24,
        italic: true,
        align: "center",
      });
    });
    g.stroke(GOLD, box(px - 1.98, y1 - 1.13, px + 1.98, y1 - 0.4), 0.03, 1, true);
  },
  back(g) {
    g.fill(INK, box(-1, 13, 14, 20), 0.6);
  },
};

function bowlBody() {
  const p = new Path2D();
  p.moveTo(-2.1, -0.5);
  p.bezierCurveTo(-3.7, -0.75, -4.5, -2.6, -4.35, RIM[1]);
  p.lineTo(4.35, RIM[1]);
  p.bezierCurveTo(4.5, -2.6, 3.7, -0.75, 2.1, -0.5);
  p.closePath();
  return p;
}
const FOOT = [
  [-1.55, 0],
  [-1.72, -0.58],
  [1.72, -0.58],
  [1.55, 0],
];
const RIM = [0, -5.15, 4.35, 1.45];
function rimPath() {
  const p = new Path2D();
  p.ellipse(RIM[0], RIM[1], RIM[2], RIM[3], 0, 0, TAU);
  return p;
}
/**
 * The lacquered well as printed: the far half is the true ellipse, the near
 * lip sags toward the crease by `sag`, so once the V lifts its middle away
 * from the reader the lip still reads as an oval, not a peak.
 */
const RIM_SAG = 0.5;
const RIM_DIP = 0.3;
/** Points of the rim, far lip then near lip, leaned for the fold. */
function rimPoints(inset = 0, sag = RIM_SAG, dip = RIM_DIP) {
  const [cx, cy] = RIM;
  const rx = RIM[2] - inset;
  const ry = RIM[3] - inset;
  const N = 48;
  const pts = [];
  // the fold lifts the crease away from the reader in proportion to |x|;
  // lean each lip against it the same way, softened right at the crease
  const lean = (x) => {
    const u = Math.abs(x) / rx;
    return Math.max(0, 1 - u) ** 1.15;
  };
  for (let i = 0; i <= N; i++) {
    const x = -rx + (2 * rx * i) / N;
    const t = Math.max(0, 1 - (x / rx) ** 2);
    pts.push([cx + x, cy - ry * Math.sqrt(t) + dip * lean(x)]);
  }
  for (let i = 1; i < N; i++) {
    const x = rx - (2 * rx * i) / N;
    const t = Math.max(0, 1 - (x / rx) ** 2);
    pts.push([cx + x, cy + ry * Math.sqrt(t) + sag * lean(x)]);
  }
  return pts;
}
function rimInner(inset = 0) {
  return g0path(rimPoints(inset));
}

// seams start on the near lip (y ≈ −3.7) and run down to the foot; one
// crosses the lacquered well inside; a lost chip is filled solid gold
const SEAMS = [
  [
    [-2.7, -4.05],
    [-2.42, -3.35],
    [-2.85, -2.7],
    [-2.3, -2.0],
    [-2.55, -1.3],
    [-2.05, -0.62],
  ],
  [
    [-2.85, -2.7],
    [-3.5, -2.35],
    [-3.98, -1.8],
  ],
  [
    [0.9, -3.75],
    [1.25, -3.1],
    [0.85, -2.55],
    [1.6, -1.95],
    [1.35, -1.25],
    [1.8, -0.6],
  ],
  [
    [1.6, -1.95],
    [2.6, -2.25],
    [3.3, -1.8],
    [3.98, -2.1],
  ],
  [
    [0.9, -3.75],
    [0.68, -4.3],
    [1.15, -4.9],
    [0.8, -5.5],
    [1.05, -6.1],
  ],
  [
    [-1.2, -0.55],
    [-1.0, -0.3],
    [-1.25, 0],
  ],
];
const PATCH = [
  [2.55, -4.15],
  [3.45, -3.9],
  [3.25, -3.3],
  [2.9, -3.5],
  [2.62, -3.32],
];

const bowl = {
  id: "bowl",
  kind: "vfold",
  on: "plinth",
  day: 64,
  at: 16.0,
  glue: [80, 80],
  angle: [90, 90],
  outline: () =>
    weightTop(
      snapBase(
        trace({ x0: -4.7, y0: -6.9, w: 9.4, h: 7.1 }, (ctx) => {
          ctx.fill(g0path(FOOT));
          ctx.fill(bowlBody());
          ctx.fill(rimInner());
        }),
      ),
      -5.6,
    ),
  front(g) {
    // black raku body and foot
    g.ink(INK, (ctx) => {
      ctx.fill(bowlBody());
      ctx.fill(g.path(FOOT));
    });
    // hare's-fur streaks and a soft glaze sheen, knocked into the black
    g.knock(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.28);
      ctx.lineWidth = 0.05;
      for (let i = 0; i < 26; i++) {
        const x = g.rng.range(-4, 4);
        const y = g.rng.range(-4.5, -3.2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x * 0.92, y + g.rng.range(0.6, 1.6));
        ctx.stroke();
      }
      ctx.fillStyle = g.tone(0.5);
      ctx.beginPath();
      ctx.ellipse(-3.0, -2.7, 0.32, 1.05, 0.25, 0, TAU);
      ctx.fill();
    });
    // a red lacquer interior: the far wall lit, the well in shadow
    g.fill(RED, rimInner());
    g.glow(INK, rimInner(), 0, RIM[1] + RIM[3] * 0.35, RIM[2] * 0.9, 0.62, 0);
    g.knock(RED, (ctx) => {
      ctx.fillStyle = g.tone(0.35);
      ctx.beginPath();
      ctx.ellipse(-1.2, RIM[1] - RIM[3] * 0.45, 1.6, 0.32, -0.05, 0, TAU);
      ctx.fill();
    });
    // gold seams, knocked out of everything under them so they print clean
    const seams = (ctx, w) => {
      ctx.lineWidth = w;
      ctx.lineJoin = "miter";
      for (const s of SEAMS) ctx.stroke(g.path(s, false));
      ctx.fill(g.path(PATCH));
    };
    g.knock(INK, (ctx) => seams(ctx, 0.27));
    g.knock(RED, (ctx) => seams(ctx, 0.27));
    g.ink(GOLD, (ctx) => seams(ctx, 0.18));
    // a gold-lacquered lip all the way round, and gold dust along the seams
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.24;
      ctx.stroke(rimInner(0.1));
    });
    g.knock(RED, (ctx) => {
      ctx.lineWidth = 0.24;
      ctx.stroke(rimInner(0.1));
    });
    g.ink(GOLD, (ctx) => {
      ctx.lineWidth = 0.17;
      ctx.stroke(rimInner(0.1));
      for (const s of SEAMS) {
        for (let i = 0; i < s.length - 1; i++) {
          for (let k = 0; k < 3; k++) {
            const t = g.rng.range(0, 1);
            const x =
              s[i][0] + (s[i + 1][0] - s[i][0]) * t + g.rng.gauss() * 0.12;
            const y =
              s[i][1] + (s[i + 1][1] - s[i][1]) * t + g.rng.gauss() * 0.12;
            ctx.beginPath();
            ctx.arc(x, y, g.rng.range(0.02, 0.05), 0, TAU);
            ctx.fill();
          }
        }
      }
    });
    g.knock(INK, (ctx) => {
      ctx.fillStyle = g.tone(1);
      for (let i = 0; i < 40; i++) {
        const s = g.rng.pick(SEAMS);
        const p = g.rng.pick(s);
        ctx.beginPath();
        ctx.arc(
          p[0] + g.rng.gauss() * 0.15,
          p[1] + g.rng.gauss() * 0.15,
          0.04,
          0,
          TAU,
        );
        ctx.fill();
      }
    });
    // the foot ring
    g.stroke(
      GOLD,
      [
        [-1.6, -0.32],
        [1.6, -0.32],
      ],
      0.06,
    );
  },
  back(g) {
    g.ink(INK, (ctx) => {
      ctx.fill(bowlBody());
      ctx.fill(g.path(FOOT));
    });
    g.fill(RED, rimPath());
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.18;
      ctx.stroke(
        g.path(
          [
            [1.6, -4.15],
            [2.1, -3.2],
            [1.7, -2.1],
            [2.3, -1.0],
          ],
          false,
        ),
      );
    });
    g.stroke(
      GOLD,
      [
        [1.6, -4.15],
        [2.1, -3.2],
        [1.7, -2.1],
        [2.3, -1.0],
      ],
      0.12,
    );
  },
};
// a path from a polygon outside a painter (trace runs before any kit exists)
function g0path(poly) {
  const p = new Path2D();
  poly.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

// ================================================ the velvet rope (foreground)

const POSTS = 4.75;
function ropeCurve(ctx) {
  ctx.beginPath();
  ctx.moveTo(-POSTS + 0.15, -3.12);
  ctx.quadraticCurveTo(0, -0.72, POSTS - 0.15, -3.12);
}
/** Height of the rope at x (the same quadratic as ropeCurve). */
function ropeY(x) {
  const x0 = -POSTS + 0.15;
  const t = (x - x0) / (2 * (POSTS - 0.15));
  return (1 - t) * (1 - t) * -3.12 + 2 * (1 - t) * t * -0.72 + t * t * -3.12;
}
// the sign hangs level off the right wing, clear of the crease, on two links
const SIGNC = { x: 2.4, top: -1.72, w: 3.3, h: 1.36 };
const SIGN = roundRect(
  SIGNC.x - SIGNC.w / 2,
  SIGNC.top,
  SIGNC.w,
  SIGNC.h,
  0.14,
  3,
);
const LINKS = [SIGNC.x - 1.05, SIGNC.x + 1.05];
// a tassel at the rope's low point: it carries paper across the crease
const TASSEL = (() => {
  const y = ropeY(0) + 0.12;
  return {
    cap: [
      [-0.2, y - 0.1],
      [0.2, y - 0.1],
      [0.22, y + 0.26],
      [-0.22, y + 0.26],
    ],
    fringe: [
      [-0.17, y + 0.24],
      [0.17, y + 0.24],
      [0.36, y + 1.08],
      [-0.36, y + 1.08],
    ],
  };
})();

function ropeSolid(ctx) {
  for (const s of [-1, 1]) {
    const x = POSTS * s;
    ctx.beginPath();
    ctx.ellipse(x, 0, 0.64, 0.34, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 0.64, -0.1, 1.28, 0.1);
    ctx.fillRect(x - 0.17, -3.35, 0.34, 3.3);
    ctx.fillRect(x - 0.27, -3.42, 0.54, 0.16);
    ctx.beginPath();
    ctx.arc(x, -3.68, 0.33, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = 0.38;
  ctx.lineCap = "round";
  ropeCurve(ctx);
  ctx.stroke();
  ctx.fill(g0path(SIGN));
  for (const lx of LINKS)
    ctx.fillRect(lx - 0.07, ropeY(lx) - 0.05, 0.14, SIGNC.top - ropeY(lx) + 0.1);
  ctx.fill(g0path(TASSEL.cap));
  ctx.fill(g0path(TASSEL.fringe));
}

const rope = {
  id: "rope",
  kind: "vfold",
  on: "gutter",
  at: 21.2,
  glue: [56, 56],
  angle: [90, 90],
  outline: () =>
    snapBase(trace({ x0: -5.6, y0: -4.3, w: 11.2, h: 4.5 }, ropeSolid)),
  front(g) {
    for (const s of [-1, 1]) {
      const x = POSTS * s;
      g.ink(GOLD, (ctx) => {
        ctx.beginPath();
        ctx.ellipse(x, 0, 0.64, 0.34, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 0.17, -3.35, 0.34, 3.3);
        ctx.fillRect(x - 0.27, -3.42, 0.54, 0.16);
        ctx.beginPath();
        ctx.arc(x, -3.68, 0.33, 0, TAU);
        ctx.fill();
      });
      g.fill(INK, box(x + 0.03, -3.3, x + 0.17, -0.3), 0.45);
      g.ink(INK, (ctx) => {
        ctx.fillStyle = g.tone(0.4);
        ctx.beginPath();
        ctx.ellipse(x + 0.12, 0, 0.5, 0.26, 0, Math.PI, 0);
        ctx.fill();
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        ctx.arc(x, -3.68, 0.33, 0, TAU);
        ctx.stroke();
      });
      g.knock(GOLD, (ctx) => {
        ctx.beginPath();
        ctx.arc(x - 0.11, -3.79, 0.08, 0, TAU);
        ctx.fill();
      });
    }
    // red velvet with a black twist
    g.ink(RED, (ctx) => {
      ctx.lineWidth = 0.38;
      ctx.lineCap = "round";
      ropeCurve(ctx);
      ctx.stroke();
    });
    g.ink(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.55);
      ctx.lineWidth = 0.05;
      for (let t = 0.03; t < 0.98; t += 0.032) {
        const x0 = -POSTS + 0.15;
        const x1 = POSTS - 0.15;
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * 0 + t * t * x1;
        const y =
          (1 - t) * (1 - t) * -3.12 + 2 * (1 - t) * t * -0.72 + t * t * -3.12;
        ctx.beginPath();
        ctx.moveTo(x - 0.1, y - 0.14);
        ctx.lineTo(x + 0.1, y + 0.14);
        ctx.stroke();
      }
    });
    // the tassel: a gold cap, a red fringe combed in black
    g.fill(RED, TASSEL.fringe);
    g.ink(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.6);
      ctx.lineWidth = 0.03;
      const [a, b, c, d] = TASSEL.fringe;
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        ctx.beginPath();
        ctx.moveTo(a[0] + (b[0] - a[0]) * t, a[1]);
        ctx.lineTo(d[0] + (c[0] - d[0]) * t, d[1]);
        ctx.stroke();
      }
    });
    g.knock(RED, (ctx) => ctx.fill(g.path(TASSEL.cap)));
    g.fill(GOLD, TASSEL.cap);
    g.stroke(INK, TASSEL.cap, 0.03, 1, true);
    // the sign: two links, a paper card with a black keyline
    for (const lx of LINKS)
      g.fill(INK, box(lx - 0.05, ropeY(lx), lx + 0.05, SIGNC.top + 0.05));
    for (const ink of [RED, GOLD, INK])
      g.knock(ink, (ctx) => ctx.fill(g.path(SIGN)));
    const { x, top, w, h } = SIGNC;
    g.stroke(INK, roundRect(x - w / 2 + 0.12, top + 0.12, w - 0.24, h - 0.24, 0.08, 3), 0.05, 1, true);
    g.text(INK, "PLEASE TOUCH", x, top + 0.6, {
      kind: "mono",
      size: 0.34,
      align: "center",
      tracking: 0.08,
      maxWidth: w - 0.5,
    });
    g.text(RED, "every number opens its day", x, top + 1.0, {
      kind: "serif",
      size: 0.26,
      italic: true,
      align: "center",
      maxWidth: w - 0.4,
    });
  },
  back(g) {
    for (const s of [-1, 1])
      g.fill(GOLD, box(POSTS * s - 0.3, -4.1, POSTS * s + 0.3, 0.1), 0.9);
    g.ink(RED, (ctx) => {
      ctx.lineWidth = 0.38;
      ropeCurve(ctx);
      ctx.stroke();
    });
    g.fill(RED, TASSEL.fringe, 0.8);
    g.fill(GOLD, TASSEL.cap);
    // the sign seen from behind sits on the other side of the crease
    const back = SIGN.map(([x, y]) => [-x, y]);
    g.fill(GOLD, back, 0.35);
    g.text(INK, "thank you", -SIGNC.x, SIGNC.top + 0.82, {
      kind: "serif",
      size: 0.34,
      italic: true,
      align: "center",
    });
  },
};

// ======================================================= the poster press (63)

// the disc sits low, so its knurled rim shows under the press as a grip
const DISC = { at: [6.4, 18.3], r: 6.3 };
const POSTER = { w: 2.6, r0: 2.2, r1: 5.5 };
const PW = POSTER.w;
const PH = POSTER.r1 - POSTER.r0;
const N_POSTERS = 6;
// seed cores in day 63's code style (SWS-7K2Q-C). The fourth is this book's
// own number: half a turn from the start, so it is the last poster found
// whichever way the reader turns.
const SEEDS = ["7K2Q", "F3XA", "M9RD", "0065", "B0WE", "Q4TL"];
const FINALE = 3;

/** The six posters, each in its local frame (0..PW × 0..PH, head at y = 0). */
const POSTERS = [
  // 0 · SOL: a red sun going down over black water
  (P) => {
    P.fill(GOLD, box(0, 0, PW, PH));
    P.circle(RED, PW / 2, 1.42, 0.82);
    for (const ink of [GOLD, RED])
      P.knock(ink, (ctx) => ctx.fillRect(0, 2.15, PW, PH));
    for (const [y, w] of [
      [2.32, 2.6],
      [2.66, 1.9],
      [2.98, 1.2],
    ])
      P.fill(INK, box((PW - w) / 2, y, (PW + w) / 2, y + 0.17));
    P.text(INK, "SOL", 0.24, 0.52, { kind: "mono", size: 0.28, tracking: 0.1 });
  },
  // 1 · GRID: a halftone field, one red square
  (P) => {
    P.ink(INK, (ctx) => {
      for (let j = 0; j < 7; j++)
        for (let i = 0; i < 6; i++) {
          const r = 0.05 + 0.16 * (0.5 + 0.5 * Math.sin(i * 0.9 + j * 0.7));
          ctx.beginPath();
          ctx.arc(0.24 + i * 0.43, 0.3 + j * 0.4, r, 0, TAU);
          ctx.fill();
        }
    });
    P.knock(INK, (ctx) => ctx.fillRect(1.25, 0.95, 1.05, 1.05));
    P.fill(RED, box(1.25, 0.95, 2.3, 2.0));
    P.text(INK, "GRID", 0.24, 3.08, { kind: "mono", size: 0.28, tracking: 0.1 });
  },
  // 2 · TYPE: the machine's own number, knocked out of black
  (P) => {
    P.fill(INK, box(0, 0, PW, PH));
    P.knockText(INK, "63", PW / 2, 1.9, {
      kind: "display",
      size: 1.7,
      align: "center",
    });
    P.fill(RED, box(0.25, 2.3, PW - 0.25, 2.58));
    P.knockText(INK, "MACHINE", PW / 2, 3.02, {
      kind: "mono",
      size: 0.27,
      align: "center",
      tracking: 0.12,
    });
  },
  // 3 · the finale: solid red, gold rays off every edge, 65 in clean paper
  (P) => {
    P.fill(RED, box(0, 0, PW, PH));
    const rays = (ctx) => {
      for (let i = 0; i < 14; i++) {
        const t0 = Math.PI + ((i + 0.25) / 14) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(PW / 2, 2.2);
        ctx.arc(PW / 2, 2.2, 5, t0, t0 + Math.PI / 28);
        ctx.closePath();
        ctx.fill();
      }
    };
    P.knock(RED, rays);
    P.ink(GOLD, rays);
    const big = { kind: "display", size: 1.75, align: "center" };
    P.text(INK, "65", PW / 2 + 0.1, 2.3, big);
    for (const ink of [RED, GOLD, INK]) P.knockText(ink, "65", PW / 2, 2.2, big);
    P.fill(INK, box(0, 2.62, PW, PH));
    P.knock(GOLD, (ctx) => ctx.fillRect(0, 2.62, PW, PH));
    P.knockText(INK, "THE END?", PW / 2, 3.04, {
      kind: "mono",
      size: 0.27,
      align: "center",
      tracking: 0.14,
    });
  },
  // 4 · WAVES
  (P) => {
    P.fill(RED, box(0, 0, PW, PH), 0.9);
    P.knock(RED, (ctx) => {
      ctx.beginPath();
      ctx.arc(1.8, 0.85, 0.48, 0, TAU);
      ctx.fill();
    });
    P.circle(GOLD, 1.8, 0.85, 0.48);
    P.ink(INK, (ctx) => {
      ctx.lineWidth = 0.1;
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        for (let x = -0.1; x <= PW + 0.15; x += 0.05) {
          const y = 1.6 + j * 0.3 + Math.sin(x * 4.2 + j * 0.9) * 0.09;
          if (x < 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
  },
  // 5 · BLOCKS
  (P) => {
    P.fill(GOLD, box(0.25, 0.28, 1.75, 2.15));
    P.ink(RED, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(PW, 1.3);
      ctx.arc(PW, 1.3, 1.35, Math.PI / 2, Math.PI * 1.5);
      ctx.fill();
    });
    P.fill(INK, [
      [0.25, 3.05],
      [1.55, 3.05],
      [0.25, 1.8],
    ]);
    P.fill(INK, box(1.85, 2.62, 2.35, 3.05));
  },
];
const press = {
  id: "press",
  kind: "wheel",
  on: "page:L",
  at: DISC.at,
  radius: DISC.r,
  front(g) {
    const R = DISC.r;
    // base disc, a black knurled rim the reader grips below the press
    g.fill(GOLD, box(-R, -R, R, R), 0.2);
    g.ink(INK, (ctx) => {
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.arc(0, 0, POSTER.r1 + 0.08, 0, TAU, true);
      ctx.fill();
    });
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.05;
      for (let i = 0; i < 132; i++) {
        const t = (i / 132) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(t) * (R - 0.42), Math.sin(t) * (R - 0.42));
        ctx.lineTo(Math.cos(t) * (R - 0.08), Math.sin(t) * (R - 0.08));
        ctx.stroke();
      }
    });
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * TAU;
      g.ink(RED, (ctx) => {
        ctx.rotate(t);
        ctx.beginPath();
        ctx.moveTo(-0.22, -(R - 0.12));
        ctx.lineTo(0.22, -(R - 0.12));
        ctx.lineTo(0, -(R - 0.55));
        ctx.closePath();
        ctx.fill();
      });
    }
    // six posters round the hub; poster k comes up after k × 60° clockwise
    for (let k = 0; k < N_POSTERS; k++) {
      const th = -k * (TAU / N_POSTERS);
      const P = frame(g, rotT(th, -PW / 2, -POSTER.r1), box(0, 0, PW, PH));
      POSTERS[k](P);
      const S = frame(g, rotT(th));
      S.text(k === FINALE ? RED : INK, SEEDS[k], 0, -1.33, {
        kind: "mono",
        size: 0.3,
        align: "center",
        tracking: 0.06,
      });
    }
  },
  back(g) {
    const R = DISC.r + 0.2;
    g.fill(GOLD, box(-R, -R, R, R), 0.3);
  },
};

// the press itself: a flat card over the disc, with a window for the poster
// and one for its seed
// tall enough to hide every poster but the one in the window (the disc's
// poster ring ends at r1; only its knurled rim shows below)
const COVER = { at: [0.4, 11.6], w: 12.0, h: 12.3 };
const HUB = [DISC.at[0] - COVER.at[0], DISC.at[1] - COVER.at[1]]; // (6.0, 6.7)
const WIN = box(
  HUB[0] - PW / 2 + 0.08,
  HUB[1] - POSTER.r1 + 0.08,
  HUB[0] + PW / 2 - 0.08,
  HUB[1] - POSTER.r0 - 0.08,
);
const SEEDWIN = box(HUB[0] - 0.62, HUB[1] - 1.75, HUB[0] + 0.62, HUB[1] - 1.15);

// The press is a rounded card with its top-right corner sloped off: that
// corner is where Musée Zéro's left wing lies down when the book shuts.
// Its bottom edge carries extra (collinear) points: the shape is unchanged,
// but the preview script sorts surfaces by their vertex average, and this
// keeps the cover drawn over the disc it hides, as the app's depth buffer does.
const CHAMFER = [
  [9.8, 0],
  [12.0, 4.3],
];
function coverOutline() {
  const { w, h } = COVER;
  const r = 0.5;
  const arc = (cx, cy, a0) =>
    Array.from({ length: 5 }, (_, i) => [
      cx + Math.cos(a0 + (i / 4) * (Math.PI / 2)) * r,
      cy + Math.sin(a0 + (i / 4) * (Math.PI / 2)) * r,
    ]);
  const out = [[r, 0], ...CHAMFER, ...arc(w - r, h - r, 0)];
  for (let i = 1; i < 60; i++) out.push([w - r - (i / 60) * (w - 2 * r), h]);
  out.push(...arc(r, h - r, Math.PI / 2), ...arc(r, r, Math.PI));
  return out;
}

const cover = {
  id: "cover",
  kind: "flat",
  on: "page:L",
  day: 63,
  at: COVER.at,
  outline: coverOutline(),
  holes: [WIN, SEEDWIN],
  front(g) {
    const { w, h } = COVER;
    const [hx, hy] = HUB;
    g.fill(GOLD, box(0, 0, w, h), 0.55);
    // header
    const HEAD = 0.95;
    g.fill(INK, [
      [0, 0],
      [CHAMFER[0][0] + 0.05, 0],
      [CHAMFER[0][0] + 0.55, HEAD],
      [0, HEAD],
    ]);
    g.stroke(INK, [CHAMFER[0], CHAMFER[1]], 0.16);
    g.knock(INK, (ctx) =>
      ctxText(ctx, g, "POSTER MACHINE", w / 2 - 0.4, 0.66, {
        kind: "mono",
        size: 0.42,
        align: "center",
        tracking: 0.2,
      }),
    );
    // output frame round the window: paper margin, black frame
    const [wx0, wy0] = WIN[0];
    const [wx1, wy1] = WIN[2];
    g.knock(GOLD, (ctx) => ctx.fillRect(wx0 - 0.3, wy0 - 0.3, wx1 - wx0 + 0.6, wy1 - wy0 + 0.6));
    g.stroke(INK, box(wx0 - 0.1, wy0 - 0.1, wx1 + 0.1, wy1 + 0.1), 0.18, 1, true);
    g.stroke(INK, box(wx0 - 0.3, wy0 - 0.3, wx1 + 0.3, wy1 + 0.3), 0.04, 1, true);
    // seed readout
    g.fill(
      INK,
      box(
        SEEDWIN[0][0] - 0.12,
        SEEDWIN[0][1] - 0.1,
        SEEDWIN[2][0] + 0.12,
        SEEDWIN[2][1] + 0.1,
      ),
    );
    g.knock(INK, (ctx) => ctx.fill(g.path(SEEDWIN)));
    g.text(INK, "SEED", SEEDWIN[0][0] - 0.3, SEEDWIN[2][1] - 0.14, {
      kind: "mono",
      size: 0.26,
      align: "right",
      tracking: 0.12,
    });
    // left of the window: the day's number; right: what the machine knows
    const nx = (wx0 - 0.3) / 2;
    g.text(INK, "Nº", nx - 1.0, 1.95, { kind: "mono", size: 0.32 });
    g.text(INK, "63", nx + 0.08, 3.58, { kind: "display", size: 2.0, align: "center" });
    for (const ink of [GOLD, INK])
      g.knock(ink, (ctx) =>
        ctxText(ctx, g, "63", nx, 3.5, { kind: "display", size: 2.0, align: "center" }),
      );
    g.text(RED, "63", nx, 3.5, { kind: "display", size: 2.0, align: "center" });
    g.text(INK, "PRINTS FROM A SEED", nx, 4.3, {
      kind: "mono",
      size: 0.24,
      align: "center",
      tracking: 0.06,
      maxWidth: wx0 - 0.9,
    });
    const sx = wx1 + 1.05;
    [
      ["5", "SYSTEMS"],
      ["8", "PALETTES"],
      ["1", "SEED EACH"],
    ].forEach(([n, t], i) => {
      const y = 2.25 + i * 0.86;
      g.text(RED, n, sx, y, { kind: "display", size: 0.72, align: "right" });
      g.text(INK, t, sx + 0.22, y - 0.1, { kind: "mono", size: 0.26, tracking: 0.08 });
    });
    // the hub rivet and the dial's axle ring
    g.ink(INK, (ctx) => {
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = g.tone(0.6);
      ctx.beginPath();
      ctx.arc(hx, hy, 0.62, 0, TAU);
      ctx.stroke();
    });
    g.circle(INK, hx, hy, 0.32);
    g.circle(GOLD, hx, hy, 0.13);
    g.knock(INK, (ctx) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 0.13, 0, TAU);
      ctx.fill();
    });
    // the instruction, set big, with arrows both ways round the hub
    g.ink(RED, (ctx) => {
      ctx.lineWidth = 0.09;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 1.0, Math.PI / 2 + s * 0.35, Math.PI / 2 + s * 1.15, s < 0);
        ctx.stroke();
        const a = Math.PI / 2 + s * 1.15;
        ctx.save();
        ctx.translate(hx + Math.cos(a) * 1.0, hy + Math.sin(a) * 1.0);
        ctx.rotate(a + (s > 0 ? Math.PI / 2 : -Math.PI / 2));
        ctx.beginPath();
        ctx.moveTo(0.22, 0);
        ctx.lineTo(-0.12, -0.17);
        ctx.lineTo(-0.12, 0.17);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
    g.text(INK, "turn the dial,", hx, 8.75, {
      kind: "display",
      size: 0.72,
      align: "center",
    });
    g.text(INK, "pull a new poster", hx, 9.6, {
      kind: "display",
      size: 0.72,
      align: "center",
    });
    g.text(INK, "every seed prints its own, the same way every time", hx, 10.25, {
      kind: "serif",
      size: 0.32,
      italic: true,
      align: "center",
    });
    // controls: an ink gauge, two knobs, the big red button
    const cy = 11.3;
    g.fill(INK, box(0.9, cy - 0.17, 4.4, cy + 0.17), 0.18);
    g.fill(RED, box(0.9, cy - 0.17, 3.2, cy + 0.17));
    g.text(INK, "INK", 4.6, cy + 0.1, { kind: "mono", size: 0.24, tracking: 0.15 });
    g.circle(INK, 7.6, cy, 0.26, 0.5);
    g.circle(INK, 8.4, cy, 0.26);
    g.circle(RED, 10.35, cy - 0.04, 0.55);
    g.knock(RED, (ctx) =>
      ctxText(ctx, g, "PRINT", 10.35, cy + 0.04, {
        kind: "mono",
        size: 0.22,
        align: "center",
        tracking: 0.08,
      }),
    );
    // the dial peeks out underneath
    g.fill(INK, box(0, h - 0.16, w, h));
  },
};

// ===================================================== the shoebox lid (22)

const LID = { at: [15.0, 13.0], len: 6.4, w: 5.0 };
// page-upright frames: u runs page-right, v page-down, from the lid's
// top-left corner when shut (front) or open (back)
const LID_FRONT = [0, -1, 1, 0, 0, LID.w];
const LID_BACK = [0, 1, -1, 0, LID.len, 0];

const shoebox = {
  id: "shoebox",
  kind: "flap",
  on: "page:R",
  day: 22,
  at: LID.at,
  rot: 90,
  size: [LID.len, LID.w],
  front(g) {
    const P = frame(g, LID_FRONT);
    const { w, len } = LID;
    P.fill(RED, box(0, 0, w, len));
    P.stroke(INK, box(0.22, 0.22, w - 0.22, len - 0.22), 0.06, 1, true);
    P.fill(INK, box(0, 1.35, w, 1.95));
    P.knockText(INK, "CONFIGURATOR", w / 2, 1.78, {
      kind: "mono",
      size: 0.3,
      align: "center",
      tracking: 0.14,
    });
    // a gold 22 on a hard black shadow, both knocked clean out of the red
    const num = { kind: "display", size: 2.2, align: "center" };
    P.knockText(RED, "22", w / 2 + 0.1, 4.08, num);
    P.text(INK, "22", w / 2 + 0.1, 4.08, num);
    P.knockText(RED, "22", w / 2, 3.98, num);
    P.knockText(INK, "22", w / 2, 3.98, num);
    P.text(GOLD, "22", w / 2, 3.98, {
      kind: "display",
      size: 2.2,
      align: "center",
    });
    P.text(INK, "R3F · REACT · STUDIO-LIT", w / 2, 4.7, {
      kind: "mono",
      size: 0.24,
      align: "center",
      tracking: 0.06,
      maxWidth: w - 0.6,
    });
    P.text(INK, "3D PRODUCT", w / 2, 0.85, {
      kind: "mono",
      size: 0.26,
      align: "center",
      tracking: 0.24,
    });
    // the lift tab on the free edge: the lid swings over to the right
    P.fill(INK, box(0, 5.2, 2.0, 5.9));
    P.knockText(INK, "LIFT", 0.25, 5.66, {
      kind: "mono",
      size: 0.28,
      tracking: 0.08,
    });
    P.knock(INK, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(1.84, 5.55);
      ctx.lineTo(1.46, 5.34);
      ctx.lineTo(1.46, 5.76);
      ctx.closePath();
      ctx.fill();
    });
  },
  back(g) {
    const P = frame(g, LID_BACK);
    const { w, len } = LID;
    // tissue paper inside the lid
    P.fill(GOLD, box(0, 0, w, len), 0.3);
    P.ink(INK, (ctx) => {
      ctx.strokeStyle = g.tone(0.25);
      ctx.lineWidth = 0.025;
      for (let i = 0; i < 10; i++) {
        const x = g.rng.range(0, w);
        const y = g.rng.range(0, len);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + g.rng.range(-1.2, 1.2), y + g.rng.range(-0.8, 0.8));
        ctx.stroke();
      }
    });
    P.text(INK, "PICK A", 0.35, 0.78, {
      kind: "mono",
      size: 0.32,
      tracking: 0.12,
    });
    P.text(RED, "FINISH", 0.35, 1.22, {
      kind: "mono",
      size: 0.32,
      tracking: 0.12,
    });
    // three finishes of the same shoe, down the free side of the lid (the
    // real sneaker lies across the hinge side when the lid is open)
    const finishes = [
      ["METALLIC", (S) => {
        S.fill(GOLD, shoeShape(shoeUpper));
        S.fill(INK, shoeShape(shoeSole));
        S.fill(INK, shoeShape(shoeTab));
      }],
      ["MATTE", (S) => {
        S.fill(INK, shoeShape(shoeUpper));
        S.fill(INK, shoeShape(shoeTab));
        S.stroke(INK, shoeShape(shoeSole), 0.22);
      }],
      ["GLOSSY", (S) => {
        S.fill(RED, shoeShape(shoeUpper));
        S.knock(RED, (ctx) => {
          ctx.beginPath();
          ctx.ellipse(0.4, -1.75, 1.6, 0.22, -0.35, 0, TAU);
          ctx.fill();
        });
        S.fill(INK, shoeShape(shoeSole));
        S.fill(INK, shoeShape(shoeTab));
      }],
    ];
    const SC = 0.22;
    finishes.forEach(([name, paint], i) => {
      const cx = 4.12;
      const cy = 2.3 + i * 1.62;
      const S = frame(g, mul(LID_BACK, [SC, 0, 0, SC, cx, cy]));
      paint(S);
      P.text(INK, name, cx, cy + 0.48, {
        kind: "mono",
        size: 0.26,
        align: "center",
        tracking: 0.06,
      });
    });
  },
};

/** ctx.transform composition: a then b (b applied first). */
function mul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
/** A sneaker part as a Path2D (the part functions draw onto a context). */
function shoeShape(part) {
  const p = new Path2D();
  part({
    beginPath() {},
    moveTo: (x, y) => p.moveTo(x, y),
    lineTo: (x, y) => p.lineTo(x, y),
    quadraticCurveTo: (a, b, c, d) => p.quadraticCurveTo(a, b, c, d),
    bezierCurveTo: (a, b, c, d, e, f) => p.bezierCurveTo(a, b, c, d, e, f),
    closePath: () => p.closePath(),
  });
  return p;
}

function shoeSole(ctx) {
  ctx.beginPath();
  ctx.moveTo(-3.05, 0);
  ctx.lineTo(2.85, 0);
  ctx.quadraticCurveTo(3.45, -0.05, 3.42, -0.6);
  ctx.lineTo(3.3, -0.95);
  ctx.lineTo(-3.12, -0.95);
  ctx.quadraticCurveTo(-3.28, -0.4, -3.05, 0);
  ctx.closePath();
}
function shoeUpper(ctx) {
  ctx.beginPath();
  ctx.moveTo(-3.02, -0.9);
  ctx.bezierCurveTo(-3.28, -1.6, -3.22, -2.3, -2.95, -2.78);
  ctx.quadraticCurveTo(-2.4, -2.98, -1.75, -2.45);
  ctx.lineTo(-1.15, -3.32);
  ctx.quadraticCurveTo(-0.72, -3.55, -0.45, -3.15);
  ctx.lineTo(1.35, -2.05);
  ctx.quadraticCurveTo(2.6, -1.78, 3.15, -1.25);
  ctx.quadraticCurveTo(3.42, -1.05, 3.3, -0.9);
  ctx.closePath();
}
function shoeTab(ctx) {
  ctx.beginPath();
  ctx.moveTo(-3.38, -2.5);
  ctx.lineTo(-3.3, -3.25);
  ctx.lineTo(-2.85, -3.18);
  ctx.lineTo(-2.85, -2.6);
  ctx.closePath();
}

const sneaker = {
  id: "sneaker",
  kind: "vfold",
  on: "shoebox",
  day: 22,
  at: 3.8,
  glue: [58, 58],
  angle: [90, 90],
  outline: () =>
    snapBase(
      trace({ x0: -3.6, y0: -3.8, w: 7.3, h: 4.0 }, (ctx) => {
        shoeSole(ctx);
        ctx.fill();
        shoeUpper(ctx);
        ctx.fill();
        shoeTab(ctx);
        ctx.fill();
      }),
    ),
  front(g) {
    paintShoe(g, (ctx) => ctx);
  },
  back(g) {
    // the other side of the shoe, seen from behind: same shoe, mirrored
    const m = mirror(g);
    paintShoe(g, (ctx) => ctx.transform(...m), true);
  },
};

function paintShoe(g, T, plain = false) {
  const ink = (name, fn) => g.ink(name, (ctx) => (T(ctx), fn(ctx)));
  const knock = (name, fn) => g.knock(name, (ctx) => (T(ctx), fn(ctx)));
  ink(RED, (ctx) => {
    shoeUpper(ctx);
    ctx.fill();
  });
  // midsole paper-white with a gold stripe, outsole black
  ink(INK, (ctx) => {
    shoeTab(ctx);
    ctx.fill();
    ctx.save();
    shoeSole(ctx);
    ctx.clip();
    ctx.fillRect(-4, -0.26, 8, 0.3);
    for (let x = -2.9; x < 3.2; x += 0.36) ctx.fillRect(x, -0.36, 0.14, 0.12);
    ctx.restore();
    ctx.lineWidth = 0.05;
    shoeSole(ctx);
    ctx.stroke();
  });
  ink(GOLD, (ctx) => {
    ctx.save();
    shoeSole(ctx);
    ctx.clip();
    ctx.fillRect(-4, -0.78, 8, 0.2);
    ctx.restore();
  });
  // panels: a toe cap, an eyestay, a heel counter, in black line and shade
  ink(INK, (ctx) => {
    ctx.save();
    shoeUpper(ctx);
    ctx.clip();
    ctx.fillStyle = g.tone(0.3);
    ctx.beginPath();
    ctx.moveTo(2.0, -0.9);
    ctx.quadraticCurveTo(2.15, -1.75, 3.4, -1.4);
    ctx.lineTo(3.6, -0.9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3.4, -0.9);
    ctx.lineTo(-2.0, -0.9);
    ctx.quadraticCurveTo(-1.9, -2.0, -2.6, -3.0);
    ctx.lineTo(-3.4, -3.0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.045;
    shoeUpper(ctx);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.6, -2.38);
    ctx.lineTo(1.25, -1.62);
    ctx.stroke();
  });
  // laces and gold eyelets
  ink(INK, (ctx) => {
    ctx.lineWidth = 0.08;
    for (let i = 0; i < 4; i++) {
      const t = i / 3.4;
      const x = -1.15 + t * 2.2;
      const y = -3.0 + t * 1.15;
      ctx.beginPath();
      ctx.moveTo(x - 0.1, y + 0.32);
      ctx.lineTo(x + 0.32, y - 0.05);
      ctx.stroke();
    }
  });
  ink(GOLD, (ctx) => {
    for (let i = 0; i < 4; i++) {
      const t = i / 3.4;
      ctx.beginPath();
      ctx.arc(-1.12 + t * 2.2, -2.62 + t * 1.12, 0.07, 0, TAU);
      ctx.fill();
    }
  });
  if (!plain) {
    // the day's number on the quarter panel, in gold
    knock(RED, (ctx) =>
      ctxText(ctx, g, "22", -0.25, -1.15, {
        kind: "display",
        size: 1.05,
        align: "center",
      }),
    );
    ink(GOLD, (ctx) =>
      ctxText(ctx, g, "22", -0.25, -1.15, {
        kind: "display",
        size: 1.05,
        align: "center",
      }),
    );
    knock(INK, (ctx) =>
      ctxText(ctx, g, "R3F", -3.1, -2.75, {
        kind: "mono",
        size: 0.13,
        align: "center",
      }),
    );
  } else {
    knock(RED, (ctx) =>
      ctxText(ctx, g, "22", 0.25, -1.15, {
        kind: "display",
        size: 1.05,
        align: "center",
      }),
    );
    ink(GOLD, (ctx) =>
      ctxText(ctx, g, "22", 0.25, -1.15, {
        kind: "display",
        size: 1.05,
        align: "center",
      }),
    );
  }
}

// ======================================================= the pages

/** Art shared across the gutter, in spread coordinates (X = 0 on the spine). */
function spreadArt(g, side) {
  const S = side === "L" ? [1, 0, 0, 1, W, 0] : [1, 0, 0, 1, 0, 0];
  const P = frame(g, S);
  // gold light behind Musée Zéro, seen through its door and its zero
  P.ink(GOLD, (ctx) => {
    for (let i = 0; i < 18; i++) {
      const t0 = Math.PI + (i / 18) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, 10.9);
      ctx.arc(0, 10.9, 9, t0, t0 + Math.PI / 36);
      ctx.closePath();
      ctx.fill();
    }
  });
  P.ink(GOLD, (ctx) => {
    const gr = ctx.createRadialGradient(0, 10.6, 0, 0, 10.6, 6);
    gr.addColorStop(0, g.tone(0.75));
    gr.addColorStop(1, g.tone(0));
    ctx.fillStyle = gr;
    ctx.fillRect(-7, 3, 14, 8.2);
  });
  // the gallery floor: big gold-tint tiles under the exhibit
  P.ink(GOLD, (ctx) => {
    const T = 1.5;
    for (let j = 0; j < 9; j++) {
      for (let i = -7; i < 7; i++) {
        if ((i + j) % 2) continue;
        const x = i * T;
        const y = 11.2 + j * T;
        const fade = Math.max(0, 1 - Math.abs(x + T / 2) / 9.5);
        if (fade <= 0) continue;
        ctx.fillStyle = g.tone(0.22 * fade);
        ctx.fillRect(x, y, T, T);
      }
    }
  });
  // shade inside the plinth, glimpsed under its top
  P.fill(
    INK,
    box(-PLINTH.a, PLINTH.span[1] - 2.6, PLINTH.b, PLINTH.span[1]),
    0.72,
  );
  // the rope's shadow on the floor
  P.ink(INK, (ctx) => {
    ctx.fillStyle = g.tone(0.18);
    ctx.beginPath();
    ctx.ellipse(0, 22.6, 4.6, 0.7, 0, 0, TAU);
    ctx.fill();
  });
  // the book itself, broken and mended: gold seams across the gallery floor,
  // the black wiped away round them so the gold prints clean
  const seams = (ctx, extra) => {
    ctx.lineJoin = "miter";
    ctx.miterLimit = 3;
    for (const [w, seam] of FLOOR_SEAMS) {
      ctx.lineWidth = w + extra;
      ctx.stroke(g.path(seam, false));
    }
  };
  P.knock(INK, (ctx) => seams(ctx, 0.2));
  P.ink(GOLD, (ctx) => seams(ctx, 0));
}

// spread coordinates: X runs across the gutter (0 on the spine), Y down the
// page. One main crack starts under the bowl, runs out through the shade
// beneath the plinth and splits for both bottom corners; two hairlines branch.
const MAIN_SEAM = 0.22;
const FLOOR_SEAMS = [
  [
    MAIN_SEAM,
    [
      [-2.65, 15.9],
      [-2.5, 16.5],
      [-1.6, 17.0],
      [-2.0, 17.6],
      [-0.9, 18.2],
      [0, 18.9],
    ],
  ],
  [
    MAIN_SEAM,
    [
      [0, 18.9],
      [-1.5, 19.6],
      [-2.4, 19.3],
      [-3.9, 20.5],
      [-4.8, 20.2],
      [-6.5, 21.6],
      [-7.7, 21.3],
      [-9.1, 22.9],
      [-10.7, 24.6],
      [-12.6, 24.9],
      [-14.5, 25.35],
      [-16.0, 25.05],
      [-17.2, 26.1],
    ],
  ],
  [
    MAIN_SEAM,
    [
      [0, 18.9],
      [1.5, 19.7],
      [2.5, 19.4],
      [3.9, 20.7],
      [5.3, 20.5],
      [6.2, 21.9],
      [7.3, 21.7],
      [7.7, 23.1],
      [7.2, 24.1],
      [7.9, 25.1],
      [8.5, 26.1],
    ],
  ],
  [
    0.11,
    [
      [-4.8, 20.2],
      [-5.4, 18.8],
      [-6.9, 18.1],
      [-7.4, 16.8],
    ],
  ],
  [
    0.11,
    [
      [5.3, 20.5],
      [5.9, 22.0],
      [5.3, 23.1],
      [6.0, 24.4],
    ],
  ],
];

function leftPage(g) {
  spreadArt(g, "L");
  runningHead(g, `${CH.numeral} · ${CH.title}`, "L", INK);
  // the numeral, red with a gold shadow
  const x = M.outer;
  g.text(GOLD, CH.numeral, x + 0.14, 5.12, { kind: "display", size: 3.6 });
  g.knock(GOLD, (ctx) =>
    ctxText(ctx, g, CH.numeral, x, 5.0, { kind: "display", size: 3.6 }),
  );
  g.text(RED, CH.numeral, x, 5.0, { kind: "display", size: 3.6 });
  const tx = x + g.measure(CH.numeral, { kind: "display", size: 3.6 }) + 0.45;
  g.text(INK, "Print", tx, 3.45, { kind: "display", size: 1.3 });
  g.text(INK, "& Craft", tx, 4.85, { kind: "display", size: 1.3 });
  g.text(RED, "the last room before the end of the book", x, 6.05, {
    kind: "serif",
    size: 0.42,
    italic: true,
  });
  g.fill(GOLD, box(x, 6.45, x + 9.2, 6.6));
  g.para(
    INK,
    "Seven days of making things by hand, on a screen: a line that draws itself, a sneaker to recolour, photographs dithered down to dots, a museum without a line of JavaScript, a sticker-bombed homepage from 2001, a press that prints from a seed, and a tea bowl broken on purpose so it could be mended in gold.",
    x,
    7.35,
    9.2,
    { size: 0.37, leading: 0.5 },
  );
  folio(g, pl, "L", INK);
}

// the day-11 line: a skyline drawn in one stroke that turns into the sea
const LINE = { x0: 8.4, x1: 18.7, base: 24.35 };
function linePoints() {
  const { base } = LINE;
  let x = LINE.x0;
  const pts = [[x, base]];
  const blds = [
    [0.6, 1.3],
    [0.8, 2.4],
    [0.5, 1.7],
    [0.7, 3.3, "spire"],
    [0.9, 2.0],
    [0.55, 2.7, "dome"],
    [0.75, 1.4],
  ];
  for (const [w, h, kind] of blds) {
    pts.push([x, base - h]);
    if (kind === "spire") {
      pts.push([x + w / 2 - 0.12, base - h]);
      pts.push([x + w / 2, base - h - 0.9]);
      pts.push([x + w / 2 + 0.12, base - h]);
    }
    if (kind === "dome") {
      for (let a = Math.PI; a <= TAU + 1e-6; a += Math.PI / 10)
        pts.push([
          x + w / 2 + Math.cos(a) * (w / 2),
          base - h + Math.sin(a) * (w / 2),
        ]);
    }
    pts.push([x + w, base - h]);
    x += w;
  }
  pts.push([x, base - 0.55]);
  for (let t = 0; x + t <= LINE.x1; t += 0.06)
    pts.push([x + t, base - 0.55 + Math.sin(t * 4.6) * 0.3]);
  return pts;
}

function dayElevenLine(g) {
  const pts = linePoints();
  const lens = [0];
  for (let i = 1; i < pts.length; i++)
    lens.push(
      lens[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const total = lens[lens.length - 1];
  const cut = total * 0.66;
  const k = lens.findIndex((l) => l > cut);
  const f = (cut - lens[k - 1]) / (lens[k] - lens[k - 1]);
  const pen = [
    pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f,
    pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f,
  ];
  // a gold under-stroke, slightly fat and off, like a second drum pass
  g.ink(GOLD, (ctx) => {
    ctx.translate(0.07, 0.06);
    ctx.lineWidth = 0.2;
    ctx.stroke(g.path([...pts.slice(0, k), pen], false));
  });
  g.stroke(INK, [...pts.slice(0, k), pen], 0.1);
  // the rest of the path, still waiting to be drawn
  g.ink(INK, (ctx) => {
    ctx.setLineDash([0.01, 0.2]);
    ctx.lineWidth = 0.1;
    ctx.lineCap = "round";
    ctx.strokeStyle = g.tone(0.8);
    ctx.stroke(g.path([pen, ...pts.slice(k)], false));
  });
  // a red nib at the head of the line
  g.ink(RED, (ctx) => {
    ctx.translate(pen[0], pen[1]);
    ctx.rotate(-0.45);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-0.3, -0.7);
    ctx.lineTo(-0.22, -1.35);
    ctx.lineTo(0.22, -1.35);
    ctx.lineTo(0.3, -0.7);
    ctx.closePath();
    ctx.fill();
  });
  g.ink(INK, (ctx) => {
    ctx.translate(pen[0], pen[1]);
    ctx.rotate(-0.45);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0, -0.12);
    ctx.lineTo(0, -0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -0.85, 0.08, 0, TAU);
    ctx.fill();
  });
  g.text(RED, "11", LINE.x1, 21.15, {
    kind: "display",
    size: 0.8,
    align: "right",
  });
  g.text(INK, "a line that draws itself", LINE.x1 - 1.15, 20.95, {
    kind: "serif",
    size: 0.32,
    italic: true,
    align: "right",
  });
  g.text(INK, "AS THE PAGE SCROLLS", LINE.x1 - 1.15, 21.42, {
    kind: "mono",
    size: 0.24,
    align: "right",
    tracking: 0.14,
    tone: 0.75,
  });
}

const idx = dayIndex({
  days: CH.days,
  side: "R",
  x: 11.2,
  y: 2.55,
  width: 7.9,
  ink: INK,
  accent: RED,
});

function rightPage(g) {
  spreadArt(g, "R");
  runningHead(g, `${CH.numeral} · ${CH.title}`, "R", INK);
  g.text(RED, "IN THIS ROOM", 11.2, 2.15, {
    kind: "mono",
    size: 0.22,
    tracking: 0.2,
  });
  idx.paint(g);
  // the shoebox under its lid: a black rim, tissue, a stamped size
  const [lx, ly] = [LID.at[0] - LID.w, LID.at[1]];
  g.fill(
    INK,
    box(lx - 0.25, ly - 0.25, lx + LID.w + 0.25, ly + LID.len + 0.25),
  );
  g.knock(INK, (ctx) =>
    ctx.fillRect(lx + 0.12, ly + 0.12, LID.w - 0.24, LID.len - 0.24),
  );
  g.fill(INK, box(lx + 0.12, ly + 0.12, lx + LID.w - 0.12, ly + 0.75), 0.55);
  g.fill(
    GOLD,
    box(lx + 0.12, ly + 0.75, lx + LID.w - 0.12, ly + LID.len - 0.12),
    0.32,
  );
  g.ink(INK, (ctx) => {
    ctx.strokeStyle = g.tone(0.22);
    ctx.lineWidth = 0.025;
    for (let i = 0; i < 12; i++) {
      const x = g.rng.range(lx + 0.3, lx + LID.w - 0.3);
      const y = g.rng.range(ly + 1, ly + LID.len - 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + g.rng.range(-0.9, 0.9), y + g.rng.range(-0.6, 0.6));
      ctx.stroke();
    }
    ctx.fillStyle = g.tone(0.28);
    ctx.beginPath();
    ctx.ellipse(LID.at[0] - 1.1, LID.at[1] + 4.25, 1.6, 0.5, -0.55, 0, TAU);
    ctx.fill();
  });
  g.ink(RED, (ctx) => {
    ctx.translate(lx + 1.3, ly + 2.0);
    ctx.rotate(-0.2);
    ctx.lineWidth = 0.06;
    ctx.strokeRect(-0.75, -0.48, 1.5, 0.9);
    ctxText(ctx, g, "Nº 22", 0, 0.1, {
      kind: "mono",
      size: 0.3,
      align: "center",
    });
  });
  // where the lid lands when it opens
  const ox = LID.at[0] + 0.4;
  g.ink(GOLD, (ctx) => {
    ctx.setLineDash([0.18, 0.12]);
    ctx.lineWidth = 0.05;
    ctx.strokeRect(ox, ly + 0.2, 4.4, LID.len - 0.4);
  });
  g.text(INK, "lift", ox + 2.2, ly + 2.35, {
    kind: "display",
    size: 0.75,
    align: "center",
  });
  g.text(INK, "the lid", ox + 2.2, ly + 3.2, {
    kind: "display",
    size: 0.75,
    align: "center",
  });
  g.ink(RED, (ctx) => {
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.arc(ox + 2.2, ly + 5.2, 1.35, Math.PI * 1.05, Math.PI * 1.9);
    ctx.stroke();
    const a = Math.PI * 1.9;
    const tx = ox + 2.2 + Math.cos(a) * 1.35;
    const ty = ly + 5.2 + Math.sin(a) * 1.35;
    ctx.translate(tx, ty);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0.28, 0);
    ctx.lineTo(-0.16, -0.22);
    ctx.lineTo(-0.16, 0.22);
    ctx.closePath();
    ctx.fill();
  });
  g.text(INK, "A SNEAKER INSIDE", ox + 2.2, ly + 5.75, {
    kind: "mono",
    size: 0.24,
    align: "center",
    tracking: 0.14,
    tone: 0.8,
  });
  dayElevenLine(g);
  folio(g, pr, "R", INK);
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: "cream",
  card: "white",
  pages: { L: leftPage, R: rightPage },
  // order matters on a plane: the press disc is declared before the cover so
  // it turns beneath the cover's windows
  pieces: [museum, sticker, banner48, banner63, plinth, bowl, rope, press, cover, shoebox, sneaker],
  spots: [
    ...idx.spots,
    { day: 11, on: "page:R", rect: [8.2, 20.2, 10.7, 4.6] },
    // the "Nº 22" stamped inside the shoebox, once its lid is lifted
    { day: 22, on: "page:R", rect: [LID.at[0] - LID.w + 0.35, LID.at[1] + 1.25, 1.95, 1.45] },
  ],
};
