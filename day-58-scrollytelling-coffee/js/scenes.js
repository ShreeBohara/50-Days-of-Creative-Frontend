/**
 * Pure, deterministic layout functions for the eight chapters in the essay.
 *
 * The renderer deliberately lives elsewhere: this module only turns records and
 * summary data into CSS-pixel targets and semantic overlay descriptions. Keeping
 * the layouts free of DOM and Canvas APIs makes resize recalculation predictable
 * and lets Node exercise every visual state.
 */

export const SCENE_IDS = Object.freeze([
  'intro',
  'grid',
  'drinks',
  'months',
  'clock',
  'trend',
  'outlier',
  'finale',
]);

export const DRINK_ORDER = Object.freeze([
  'espresso',
  'latte',
  'filter',
  'cappuccino',
  'decaf',
]);

export const DRINK_COLORS = Object.freeze({
  espresso: '#3b2417',
  latte: '#c4834f',
  filter: '#76503e',
  cappuccino: '#a65f3d',
  decaf: '#8c7b6d',
});

const MONTH_LABELS = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

const WEEKDAY_LABELS = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

const REQUIRED_RECORDS = 1000;
const OUTLIER_DATE = '2025-09-16';
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const INK = '#2a1d17';
const MUTED_INK = '#8e7e72';
const PAPER = '#f3eadc';
const RED = '#b43b2f';

const SCENE_ALIASES = Object.freeze({
  cloud: 'intro',
  dots: 'grid',
  'by-drink': 'drinks',
  clusters: 'drinks',
  routine: 'months',
  bars: 'months',
  hours: 'clock',
  line: 'trend',
  spotlight: 'outlier',
  outro: 'finale',
  cup: 'finale',
});

/**
 * @typedef {Object} SceneTarget
 * @property {number} x
 * @property {number} y
 * @property {number} r
 * @property {string} color
 * @property {number} alpha
 * @property {string|number} recordId
 */

/**
 * Compute one complete visual state.
 *
 * @param {string|number} sceneId canonical id, alias, or one-based step number
 * @param {Array<Object>} records the chronologically ordered coffee purchases
 * @param {Object} stats output from summarizeDataset (used for narrative values)
 * @param {{width:number, height:number}} bounds CSS-pixel viewport bounds
 * @returns {{id:string, targets:Array<SceneTarget>, overlays:Array<Object>}}
 */
export function computeScene(sceneId, records, stats = {}, bounds = {}) {
  const id = normalizeSceneId(sceneId);
  const context = createContext(records, stats, bounds);

  let scene;
  switch (id) {
    case 'intro':
      scene = layoutIntro(context);
      break;
    case 'grid':
      scene = layoutGrid(context);
      break;
    case 'drinks':
      scene = layoutDrinks(context);
      break;
    case 'months':
      scene = layoutMonths(context);
      break;
    case 'clock':
      scene = layoutClock(context);
      break;
    case 'trend':
      scene = layoutTrend(context);
      break;
    case 'outlier':
      scene = layoutOutlier(context);
      break;
    case 'finale':
      scene = layoutFinale(context);
      break;
    default:
      throw new RangeError(`Unknown scene: ${String(sceneId)}`);
  }

  const targets = scene.targets.map((target, index) =>
    normalizeTarget(target, context.records[index], index, context.bounds),
  );

  if (targets.length !== REQUIRED_RECORDS) {
    throw new RangeError(`Scene ${id} produced ${targets.length} targets; expected ${REQUIRED_RECORDS}.`);
  }

  return { id, targets, overlays: scene.overlays };
}

function normalizeSceneId(value) {
  if (Number.isInteger(value)) {
    if (value >= 1 && value <= SCENE_IDS.length) return SCENE_IDS[value - 1];
    if (value === 0) return SCENE_IDS[0];
  }

  const raw = String(value ?? '').trim().toLowerCase();
  if (/^step-?[1-8]$/.test(raw)) {
    return SCENE_IDS[Number(raw.at(-1)) - 1];
  }
  if (/^[1-8]$/.test(raw)) return SCENE_IDS[Number(raw) - 1];
  if (SCENE_IDS.includes(raw)) return raw;
  if (SCENE_ALIASES[raw]) return SCENE_ALIASES[raw];
  throw new RangeError(`Unknown scene: ${String(value)}`);
}

function createContext(records, stats, rawBounds) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array.');
  if (records.length !== REQUIRED_RECORDS) {
    throw new RangeError(`computeScene requires exactly ${REQUIRED_RECORDS} records.`);
  }

  const width = Number(rawBounds.width);
  const height = Number(rawBounds.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError('bounds.width and bounds.height must be positive finite numbers.');
  }

  const bounds = { width, height };
  const padX = clamp(width * 0.075, 18, 76);
  const padTop = clamp(height * 0.105, 24, 86);
  const padBottom = clamp(height * 0.12, 28, 96);
  const frame = {
    left: padX,
    right: width - padX,
    top: padTop,
    bottom: height - padBottom,
  };
  frame.width = Math.max(1, frame.right - frame.left);
  frame.height = Math.max(1, frame.bottom - frame.top);
  frame.cx = frame.left + frame.width / 2;
  frame.cy = frame.top + frame.height / 2;

  const normalized = records.map((record, index) => normalizeRecord(record, index));
  const months = Array.from({ length: 12 }, () => []);
  const hours = Array.from({ length: 24 }, () => []);
  const drinks = new Map(DRINK_ORDER.map((drink) => [drink, []]));
  const weeks = Array.from({ length: 52 }, () => []);
  const dateGroups = new Map();

  for (const record of normalized) {
    months[record.month].push(record.index);
    hours[record.hour].push(record.index);
    if (!drinks.has(record.drink)) drinks.set(record.drink, []);
    drinks.get(record.drink).push(record.index);
    weeks[record.week].push(record.index);
    if (!dateGroups.has(record.dateKey)) dateGroups.set(record.dateKey, []);
    dateGroups.get(record.dateKey).push(record.index);
  }

  const weekAverages = weeks.map((items, week) => items.length / (week === 51 ? 8 : 7));
  const totalSpend = pickFinite(
    stats.totalSpend,
    stats.totalSpent,
    stats.spend?.total,
    normalized.reduce((sum, record) => sum + record.price, 0),
  );
  const drinkCounts = Object.fromEntries(
    [...drinks.entries()].map(([drink, items]) => [drink, items.length]),
  );
  const derivedTopDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'coffee';
  const summaryTopDrink = Object.entries(stats.typeCounts ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topDrink =
    (typeof stats.topDrink === 'string' && stats.topDrink) ||
    stats.topDrink?.drink ||
    stats.topDrink?.name ||
    summaryTopDrink ||
    derivedTopDrink;
  const peakHour = Math.round(
    pickFinite(
      stats.peakHour?.hour,
      stats.peakHour,
      hours.reduce((best, items, hour) => (items.length > hours[best].length ? hour : best), 0),
    ),
  );

  return {
    bounds,
    dateGroups,
    drinkCounts,
    drinks,
    frame,
    hours,
    months,
    normalized,
    peakHour,
    records,
    stats,
    topDrink,
    totalSpend,
    weekAverages,
    weeks,
  };
}

function normalizeRecord(record, index) {
  if (!record || typeof record !== 'object') {
    throw new TypeError(`Record ${index} must be an object.`);
  }

  const parsed = parseDate(record.date);
  if (!parsed) throw new TypeError(`Record ${index} has an invalid date.`);

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const dayStart = Date.UTC(year, 0, 1);
  const dayIndex = Math.floor((parsed.getTime() - dayStart) / 86_400_000);
  const dateKey = parsed.toISOString().slice(0, 10);
  const hour = clamp(Math.floor(Number(record.hour)), 0, 23);
  const rawDrink = String(record.drink ?? record.drinkType ?? record.type ?? '').toLowerCase();
  const drink = DRINK_ORDER.includes(rawDrink) ? rawDrink : 'filter';

  return {
    dateKey,
    dayIndex,
    drink,
    hour: Number.isFinite(hour) ? hour : 0,
    index,
    month,
    price: Number.isFinite(Number(record.price)) ? Number(record.price) : 0,
    week: clamp(Math.floor(dayIndex / 7), 0, 51),
    weekday: Number.isInteger(record.weekday) ? record.weekday : parsed.getUTCDay(),
  };
}

function parseDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isFinite(date.getTime()) ? date : null;
}

function layoutIntro(context) {
  const { frame, normalized } = context;
  const targets = normalized.map((record, index) => {
    const progress = Math.sqrt((index + 0.55) / REQUIRED_RECORDS);
    const phase = index * GOLDEN_ANGLE + signedNoise(index, 7) * 0.22;
    const organic = 1 + Math.sin(phase * 3 + 0.8) * 0.07;
    const x =
      frame.cx +
      Math.cos(phase) * progress * frame.width * 0.44 * organic +
      signedNoise(index, 13) * Math.min(9, frame.width * 0.016);
    const y =
      frame.cy +
      Math.sin(phase) * progress * frame.height * 0.39 +
      signedNoise(index, 29) * Math.min(8, frame.height * 0.014);

    return {
      x,
      y,
      r: 2.25,
      alpha: 0.72,
      color: DRINK_COLORS[record.drink],
      driftAmplitude: 1.6 + unitNoise(index, 41) * 2.6,
      driftPhase: unitNoise(index, 53) * TAU,
      group: record.drink,
    };
  });

  return {
    targets,
    overlays: [
      {
        type: 'halo',
        x: frame.cx,
        y: frame.cy,
        radius: Math.min(frame.width, frame.height) * 0.43,
        color: '#c9a985',
        alpha: 0.08,
      },
      {
        type: 'scene-note',
        text: '1,000 cups · January—December 2025',
        x: frame.cx,
        y: frame.bottom,
        align: 'center',
      },
    ],
  };
}

function layoutGrid(context) {
  const { frame, normalized } = context;
  const columns = 40;
  const rows = 25;
  const gapX = frame.width / (columns - 1);
  const gapY = frame.height / (rows - 1);
  const radius = clamp(Math.min(gapX, gapY) * 0.27, 1.15, 3.15);

  const targets = normalized.map((record, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: frame.left + column * gapX,
      y: frame.top + row * gapY,
      r: radius,
      alpha: 0.82,
      color: INK,
      column,
      row,
    };
  });

  return {
    targets,
    overlays: [
      {
        type: 'grid-frame',
        columns,
        rows,
        x: frame.left,
        y: frame.top,
        width: frame.width,
        height: frame.height,
      },
      {
        type: 'scene-note',
        text: 'Each mark is one purchase. Focus the chart, then use the arrow keys to inspect.',
        x: frame.left,
        y: Math.max(12, frame.top - 18),
        align: 'left',
      },
    ],
  };
}

function layoutDrinks(context) {
  const { drinks, frame, normalized } = context;
  const wide = frame.width > frame.height * 1.45;
  const positions = wide
    ? [
        [0.1, 0.5],
        [0.3, 0.5],
        [0.5, 0.5],
        [0.7, 0.5],
        [0.9, 0.5],
      ]
    : [
        [0.18, 0.3],
        [0.5, 0.27],
        [0.82, 0.3],
        [0.33, 0.72],
        [0.68, 0.72],
      ];
  const clusterWidth = frame.width * (wide ? 0.083 : 0.14);
  const clusterHeight = frame.height * (wide ? 0.35 : 0.17);
  const targetByIndex = new Array(REQUIRED_RECORDS);
  const overlays = [];

  DRINK_ORDER.forEach((drink, groupIndex) => {
    const items = drinks.get(drink) ?? [];
    const [px, py] = positions[groupIndex];
    const cx = frame.left + frame.width * px;
    const cy = frame.top + frame.height * py;
    const count = Math.max(1, items.length);

    items.forEach((recordIndex, rank) => {
      const radius = Math.sqrt((rank + 0.45) / count);
      const angle = rank * GOLDEN_ANGLE + groupIndex * 0.7;
      targetByIndex[recordIndex] = {
        x: cx + Math.cos(angle) * radius * clusterWidth,
        y: cy + Math.sin(angle) * radius * clusterHeight,
        r: 2.45,
        alpha: 0.9,
        color: DRINK_COLORS[drink],
        group: drink,
        rank,
      };
    });

    overlays.push({
      type: 'cluster-label',
      drink,
      count: items.length,
      text: `${titleCase(drink)} · ${items.length}`,
      x: cx,
      y: clamp(cy + clusterHeight + 22, 12, context.bounds.height - 8),
      color: DRINK_COLORS[drink],
      align: 'center',
    });
  });

  // Unknown drink names normalize to filter, so every input still receives a target.
  normalized.forEach((record, index) => {
    if (!targetByIndex[index]) {
      targetByIndex[index] = {
        x: frame.cx,
        y: frame.cy,
        r: 2.4,
        alpha: 0.9,
        color: DRINK_COLORS[record.drink],
        group: record.drink,
      };
    }
  });

  return { targets: targetByIndex, overlays };
}

function layoutMonths(context) {
  const { frame, months } = context;
  const targetByIndex = new Array(REQUIRED_RECORDS);
  const laneWidth = frame.width / 12;
  const slotsPerLayer = clamp(Math.floor(laneWidth / 6), 2, 5);
  const maxLayers = Math.max(...months.map((items) => Math.ceil(items.length / slotsPerLayer)), 1);
  const chartTop = frame.top + Math.min(30, frame.height * 0.08);
  const baseline = frame.bottom - Math.min(22, frame.height * 0.06);
  const verticalStep = (baseline - chartTop) / Math.max(1, maxLayers - 1);
  const horizontalStep = Math.min(5.2, laneWidth / (slotsPerLayer + 1));
  const radius = clamp(Math.min(horizontalStep, verticalStep || horizontalStep) * 0.34, 1.2, 2.7);

  months.forEach((items, month) => {
    const centerX = frame.left + laneWidth * (month + 0.5);
    items.forEach((recordIndex, rank) => {
      const slot = rank % slotsPerLayer;
      const layer = Math.floor(rank / slotsPerLayer);
      targetByIndex[recordIndex] = {
        x: centerX + (slot - (slotsPerLayer - 1) / 2) * horizontalStep,
        y: baseline - layer * verticalStep,
        r: radius,
        alpha: 0.84,
        color: month === 11 ? '#9b6546' : INK,
        layer,
        month,
        rank,
      };
    });
  });

  const labels = MONTH_LABELS.map((label, month) => ({
    label,
    month,
    count: months[month].length,
    x: frame.left + laneWidth * (month + 0.5),
    y: frame.bottom,
  }));
  const decemberX = frame.left + laneWidth * 11.5;

  return {
    targets: targetByIndex,
    overlays: [
      {
        type: 'month-axis',
        baseline,
        labels,
        maxCount: Math.max(...months.map((items) => items.length)),
      },
      {
        type: 'annotation',
        id: 'vacation-gap',
        text: 'Nine quiet days · Dec 20—28',
        x: clamp(decemberX - laneWidth * 0.45, 8, context.bounds.width - 8),
        y: chartTop,
        targetX: decemberX,
        targetY: baseline - Math.min(42, frame.height * 0.12),
        align: 'right',
        color: MUTED_INK,
      },
    ],
  };
}

function layoutClock(context) {
  const { frame, hours } = context;
  const targetByIndex = new Array(REQUIRED_RECORDS);
  const maxCount = Math.max(...hours.map((items) => items.length), 1);
  const radius = Math.min(frame.width, frame.height) * 0.34;
  const band = Math.max(12, radius * 0.28);
  const center = { x: frame.cx, y: frame.cy };
  const hourSummaries = [];

  hours.forEach((items, hour) => {
    const count = items.length;
    const density = count / maxCount;
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.max(1, Math.ceil(count / columns));
    const baseAngle = -Math.PI / 2 + (hour / 24) * TAU;

    items.forEach((recordIndex, rank) => {
      const column = rank % columns;
      const row = Math.floor(rank / columns);
      const angleOffset =
        columns === 1 ? 0 : ((column / (columns - 1)) - 0.5) * (TAU / 24) * 0.7;
      const radialOffset = rows === 1 ? 0 : ((row / (rows - 1)) - 0.5) * band;
      const pointRadius = radius + radialOffset;
      const angle = baseAngle + angleOffset;
      targetByIndex[recordIndex] = {
        x: center.x + Math.cos(angle) * pointRadius,
        y: center.y + Math.sin(angle) * pointRadius,
        r: 2.35,
        alpha: 0.25 + Math.pow(density, 0.72) * 0.75,
        color: hour >= 6 && hour <= 10 ? '#a65f3d' : '#5c4032',
        density,
        hour,
        rank,
      };
    });

    const labelRadius = radius + band * 0.9 + 14;
    hourSummaries.push({
      hour,
      count,
      density,
      label: String(hour).padStart(2, '0'),
      x: center.x + Math.cos(baseAngle) * labelRadius,
      y: center.y + Math.sin(baseAngle) * labelRadius,
    });
  });

  const peakHour = hourSummaries.reduce(
    (best, item) => (item.count > best.count ? item : best),
    hourSummaries[0],
  );

  return {
    targets: targetByIndex,
    overlays: [
      {
        type: 'clock-face',
        center,
        radius,
        band,
        hours: hourSummaries,
      },
      {
        type: 'annotation',
        id: 'morning-peak',
        text: `Peak hour · ${formatHour(peakHour.hour)} · ${peakHour.count} cups`,
        x: frame.cx,
        y: frame.cy,
        targetX: peakHour.x,
        targetY: peakHour.y,
        align: 'center',
        color: '#8d4c31',
      },
    ],
  };
}

function layoutTrend(context, { quiet = false } = {}) {
  const { frame, weekAverages, weeks } = context;
  const targetByIndex = new Array(REQUIRED_RECORDS);
  const maxAverage = Math.max(...weekAverages, 1);
  const chartTop = frame.top + Math.min(24, frame.height * 0.06);
  const baseline = frame.bottom - Math.min(18, frame.height * 0.05);
  const chartHeight = Math.max(1, baseline - chartTop);
  const weekSpacing = frame.width / 51;
  const points = weekAverages.map((average, week) => ({
    week,
    average,
    x: frame.left + (week / 51) * frame.width,
    y: baseline - (average / maxAverage) * chartHeight * 0.88,
  }));

  weeks.forEach((items, week) => {
    const point = points[week];
    items.forEach((recordIndex, rank) => {
      targetByIndex[recordIndex] = {
        x: point.x + signedNoise(recordIndex, 101) * Math.max(1.3, weekSpacing * 0.35),
        y: point.y + signedNoise(recordIndex, 137) * Math.min(10, chartHeight * 0.025),
        r: quiet ? 1.65 : 2.15,
        alpha: quiet ? 0.12 : 0.58,
        color: quiet ? MUTED_INK : '#654433',
        average: point.average,
        week,
        rank,
      };
    });
  });

  return {
    targets: targetByIndex,
    overlays: [
      {
        type: 'trend-area',
        points,
        baseline,
        color: '#b97951',
        alpha: quiet ? 0.025 : 0.12,
      },
      {
        type: 'trend-line',
        points,
        color: quiet ? MUTED_INK : INK,
        alpha: quiet ? 0.18 : 0.88,
      },
      {
        type: 'trend-axis',
        top: chartTop,
        baseline,
        maxAverage,
        labels: [
          { text: 'JAN', x: points[0].x, y: frame.bottom },
          { text: 'APR', x: points[13].x, y: frame.bottom },
          { text: 'JUL', x: points[26].x, y: frame.bottom },
          { text: 'OCT', x: points[39].x, y: frame.bottom },
          { text: 'DEC', x: points[51].x, y: frame.bottom },
        ],
      },
    ],
  };
}

function layoutOutlier(context) {
  const trend = layoutTrend(context, { quiet: true });
  const outlierDate = resolveOutlierDate(context);
  const outlierIndices = context.dateGroups.get(outlierDate) ?? [];
  const highlighted = outlierIndices.slice(0, 7);
  const source = context.normalized[highlighted[0]];
  const line = trend.overlays.find((overlay) => overlay.type === 'trend-line');
  const basePoint = line?.points[source?.week ?? 0] ?? { x: context.frame.cx, y: context.frame.cy };
  const anchor = {
    x: clamp(basePoint.x, context.frame.left + 40, context.frame.right - 40),
    y: clamp(basePoint.y - Math.min(52, context.frame.height * 0.12), context.frame.top + 34, context.frame.bottom - 34),
  };

  highlighted.forEach((recordIndex, rank) => {
    const progress = highlighted.length === 1 ? 0.5 : rank / (highlighted.length - 1);
    const angle = Math.PI * (1.12 + progress * 0.76);
    const fanRadius = 21 + (rank % 2) * 11;
    trend.targets[recordIndex] = {
      ...trend.targets[recordIndex],
      x: anchor.x + Math.cos(angle) * fanRadius,
      y: anchor.y + Math.sin(angle) * fanRadius,
      r: 4.1,
      alpha: 1,
      color: RED,
      highlighted: true,
      pulse: true,
      pulsePhase: (rank / Math.max(1, highlighted.length)) * TAU,
      outlierDate,
    };
  });

  return {
    targets: trend.targets,
    overlays: [
      ...trend.overlays,
      {
        type: 'spotlight',
        x: anchor.x,
        y: anchor.y,
        radius: 48,
        color: RED,
        alpha: 0.08,
      },
      {
        type: 'annotation',
        id: 'seven-cup-outlier',
        text: `${formatLongDate(outlierDate)} · ${highlighted.length} coffees`,
        detail: 'The spreadsheet insists this happened.',
        x: clamp(anchor.x - 74, 12, context.bounds.width - 12),
        y: clamp(anchor.y - 70, 14, context.bounds.height - 14),
        targetX: anchor.x,
        targetY: anchor.y,
        align: anchor.x > context.bounds.width * 0.55 ? 'right' : 'left',
        color: RED,
      },
    ],
  };
}

function resolveOutlierDate(context) {
  const candidates = [
    context.stats.outlierDate,
    context.stats.outlier?.date,
    context.stats.outlierDay?.date,
    OUTLIER_DATE,
  ].filter((value) => typeof value === 'string');

  for (const candidate of candidates) {
    const dateKey = candidate.slice(0, 10);
    if ((context.dateGroups.get(dateKey)?.length ?? 0) >= 7) return dateKey;
  }

  return [...context.dateGroups.entries()].sort((a, b) => {
    const countDifference = b[1].length - a[1].length;
    return countDifference || a[0].localeCompare(b[0]);
  })[0]?.[0] ?? OUTLIER_DATE;
}

function layoutFinale(context) {
  const targets = new Array(REQUIRED_RECORDS);
  const counts = { cup: 500, handle: 150, saucer: 170, steam: 180 };
  const scale = Math.min(context.frame.width, context.frame.height) * 0.98;
  const origin = { x: context.frame.cx, y: context.frame.cy };
  let cursor = 0;

  for (let rank = 0; rank < counts.cup; rank += 1, cursor += 1) {
    const point = cupPoint(rank, counts.cup);
    targets[cursor] = finalTarget(point, 'cup', rank, origin, scale, '#543526');
  }
  for (let rank = 0; rank < counts.handle; rank += 1, cursor += 1) {
    const point = handlePoint(rank, counts.handle);
    targets[cursor] = finalTarget(point, 'handle', rank, origin, scale, '#754a33');
  }
  for (let rank = 0; rank < counts.saucer; rank += 1, cursor += 1) {
    const point = saucerPoint(rank, counts.saucer);
    targets[cursor] = finalTarget(point, 'saucer', rank, origin, scale, '#8a5b3d');
  }
  for (let rank = 0; rank < counts.steam; rank += 1, cursor += 1) {
    const point = steamPoint(rank, counts.steam);
    targets[cursor] = finalTarget(point, 'steam', rank, origin, scale, '#b78662');
  }

  const spend = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(context.totalSpend);

  return {
    targets,
    overlays: [
      {
        type: 'constellation-key',
        parts: counts,
        x: origin.x,
        y: origin.y,
        scale,
      },
      {
        type: 'title-card',
        eyebrow: 'ONE YEAR, HELD IN ONE CUP',
        title: '1,000 coffees later.',
        detail: `${spend} spent · ${titleCase(context.topDrink)} ordered most · peak at ${formatHour(
          context.peakHour,
        )}`,
        x: origin.x,
        y: clamp(context.frame.bottom + 6, 12, context.bounds.height - 10),
        align: 'center',
      },
    ],
  };
}

function cupPoint(rank, count) {
  const section = rank / count;
  if (section < 0.22) {
    const t = section / 0.22;
    const angle = Math.PI + t * TAU;
    return { x: 0.47 + Math.cos(angle) * 0.205, y: 0.36 + Math.sin(angle) * 0.036 };
  }
  if (section < 0.48) {
    const t = (section - 0.22) / 0.26;
    return quadraticPoint(
      { x: 0.268, y: 0.36 },
      { x: 0.28, y: 0.65 },
      { x: 0.37, y: 0.69 },
      t,
    );
  }
  if (section < 0.74) {
    const t = (section - 0.48) / 0.26;
    const angle = Math.PI - t * Math.PI;
    return { x: 0.47 + Math.cos(angle) * 0.1, y: 0.675 + Math.sin(angle) * 0.035 };
  }
  const t = (section - 0.74) / 0.26;
  return quadraticPoint(
    { x: 0.57, y: 0.69 },
    { x: 0.66, y: 0.65 },
    { x: 0.672, y: 0.36 },
    t,
  );
}

function handlePoint(rank, count) {
  const t = rank / Math.max(1, count - 1);
  const lane = rank % 2;
  const angle = -Math.PI / 2 + t * Math.PI;
  const rx = lane ? 0.145 : 0.112;
  const ry = lane ? 0.155 : 0.118;
  return { x: 0.65 + Math.cos(angle) * rx, y: 0.5 + Math.sin(angle) * ry };
}

function saucerPoint(rank, count) {
  const t = rank / Math.max(1, count - 1);
  const lane = rank % 3;
  const angle = t * Math.PI;
  return {
    x: 0.48 + Math.cos(angle) * (0.29 - lane * 0.018),
    y: 0.73 + Math.sin(angle) * (0.066 - lane * 0.006),
  };
}

function steamPoint(rank, count) {
  const strandSize = count / 3;
  const strand = Math.min(2, Math.floor(rank / strandSize));
  const localRank = rank - strand * strandSize;
  const t = localRank / Math.max(1, strandSize - 1);
  return {
    x: 0.37 + strand * 0.1 + Math.sin(t * Math.PI * 2.4 + strand * 0.8) * 0.025,
    y: 0.3 - t * 0.205,
  };
}

function finalTarget(point, part, rank, origin, scale, color) {
  const jitter = signedNoise(rank, 211 + part.length) * 0.0035;
  return {
    x: origin.x + (point.x - 0.5 + jitter) * scale,
    y: origin.y + (point.y - 0.48 - jitter) * scale,
    r: part === 'steam' ? 1.7 : 2.05,
    alpha: part === 'steam' ? 0.62 : 0.86,
    color,
    part,
    rank,
  };
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function normalizeTarget(target, record, index, bounds) {
  if (!target || typeof target !== 'object') {
    throw new TypeError(`Missing target for record ${index}.`);
  }
  const x = Number(target.x);
  const y = Number(target.y);
  const radius = Number(target.r);
  const alpha = Number(target.alpha);
  if (![x, y, radius, alpha].every(Number.isFinite)) {
    throw new TypeError(`Scene target ${index} contains a non-finite value.`);
  }

  return {
    ...target,
    x: clamp(x, 0, bounds.width),
    y: clamp(y, 0, bounds.height),
    r: clamp(radius, 0.5, 8),
    radius: clamp(Number(target.radius ?? radius), 0.5, 8),
    alpha: clamp(alpha, 0, 1),
    color: target.color || INK,
    recordId: record.id ?? index,
  };
}

function formatHour(hour) {
  const safeHour = clamp(Math.floor(Number(hour) || 0), 0, 23);
  const suffix = safeHour >= 12 ? 'PM' : 'AM';
  const display = safeHour % 12 || 12;
  return `${display}:00 ${suffix}`;
}

function formatLongDate(dateKey) {
  const date = parseDate(dateKey);
  if (!date) return dateKey;
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(date);
  return `${WEEKDAY_LABELS[date.getUTCDay()]}, ${month} ${date.getUTCDate()}`;
}

function titleCase(value) {
  const string = String(value ?? '');
  return string ? string[0].toUpperCase() + string.slice(1) : string;
}

function pickFinite(...values) {
  return values.map(Number).find(Number.isFinite) ?? 0;
}

function unitNoise(index, salt) {
  let value = Math.imul((index + 1) ^ salt, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_295;
}

function signedNoise(index, salt) {
  return unitNoise(index, salt) * 2 - 1;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export const SCENE_THEME = Object.freeze({
  ink: INK,
  mutedInk: MUTED_INK,
  paper: PAPER,
  red: RED,
});
