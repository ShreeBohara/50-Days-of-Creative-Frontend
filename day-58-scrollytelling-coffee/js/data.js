export const DATA_SEED = 58058;
export const DATA_YEAR = 2025;
export const OUTLIER_DATE = "2025-09-16";
export const VACATION_START = "2025-12-20";
export const VACATION_END = "2025-12-28";

export const DRINK_TYPES = Object.freeze([
  "espresso",
  "latte",
  "filter",
  "cappuccino",
  "decaf",
]);

export const TYPE_PRICES = Object.freeze({
  espresso: Object.freeze([2.75, 3, 3.25]),
  latte: Object.freeze([4.75, 5, 5.25, 5.5]),
  filter: Object.freeze([3.25, 3.5, 3.75, 4]),
  cappuccino: Object.freeze([4.25, 4.5, 4.75]),
  decaf: Object.freeze([3, 3.25, 3.5]),
});

const PURCHASE_COUNT = 1000;
const OUTLIER_COUNT = 7;
const MAX_ORDINARY_DAILY_COUNT = OUTLIER_COUNT - 1;
const MS_PER_DAY = 86_400_000;
const WEEKDAYS = Object.freeze([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

// The hour weights put most cups in the 06:00–11:00 window while retaining a
// thin, believable tail throughout the rest of the day.
const HOUR_WEIGHTS = Object.freeze([
  0.08, 0.03, 0.02, 0.02, 0.08, 0.4,
  1.2, 4.5, 8.2, 7.6, 4.1, 1.6,
  1, 0.9, 1.1, 0.8, 0.6, 0.45,
  0.3, 0.2, 0.15, 0.12, 0.1, 0.08,
]);

const TYPE_WEIGHTS_BY_PERIOD = Object.freeze({
  early: Object.freeze([0.27, 0.2, 0.32, 0.15, 0.06]),
  morning: Object.freeze([0.21, 0.27, 0.31, 0.16, 0.05]),
  afternoon: Object.freeze([0.3, 0.27, 0.18, 0.14, 0.11]),
  evening: Object.freeze([0.22, 0.2, 0.16, 0.12, 0.3]),
});

function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function weightedIndex(weights, random) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;

  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor < 0) return index;
  }

  return weights.length - 1;
}

function buildEligibleDates() {
  const start = Date.UTC(DATA_YEAR, 0, 1);
  const end = Date.UTC(DATA_YEAR + 1, 0, 1);
  const dates = [];

  for (let timestamp = start; timestamp < end; timestamp += MS_PER_DAY) {
    const date = new Date(timestamp);
    const isoDate = toIsoDate(date);

    if (
      isoDate === OUTLIER_DATE
      || (isoDate >= VACATION_START && isoDate <= VACATION_END)
    ) {
      continue;
    }

    const dayIndex = Math.round((timestamp - start) / MS_PER_DAY);
    const yearProgress = dayIndex / 364;
    const weekdayIndex = date.getUTCDay();
    const mondaySpike = weekdayIndex === 1 ? 1.9 : 1;
    const weekendDip = weekdayIndex === 0 || weekdayIndex === 6 ? 0.72 : 1;

    dates.push({
      isoDate,
      dayIndex,
      weekdayIndex,
      weight: (0.65 + yearProgress * 1.2) * mondaySpike * weekendDip,
    });
  }

  return dates;
}

function allocateOrdinaryPurchases(random) {
  const dates = buildEligibleDates();
  const counts = new Uint8Array(dates.length);
  const weights = dates.map(({ weight }) => weight);
  let remaining = PURCHASE_COUNT - OUTLIER_COUNT;

  while (remaining > 0) {
    const dateIndex = weightedIndex(weights, random);
    if (counts[dateIndex] >= MAX_ORDINARY_DAILY_COUNT) continue;
    counts[dateIndex] += 1;
    remaining -= 1;
  }

  return dates.map((date, index) => ({ ...date, count: counts[index] }));
}

function typeWeightsForHour(hour) {
  if (hour < 6) return TYPE_WEIGHTS_BY_PERIOD.early;
  if (hour < 12) return TYPE_WEIGHTS_BY_PERIOD.morning;
  if (hour < 18) return TYPE_WEIGHTS_BY_PERIOD.afternoon;
  return TYPE_WEIGHTS_BY_PERIOD.evening;
}

function createDraftRecord(isoDate, hour, random, sourceIndex, forcedType) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const minute = Math.floor(random() * 60);
  const drinkType = forcedType ?? DRINK_TYPES[
    weightedIndex(typeWeightsForHour(hour), random)
  ];
  const prices = TYPE_PRICES[drinkType];
  const price = prices[Math.floor(random() * prices.length)];

  return {
    sourceIndex,
    date: isoDate,
    hour,
    minute,
    timestamp: `${isoDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
    drinkType,
    drink: drinkType,
    price,
    weekday: WEEKDAYS[date.getUTCDay()],
    weekdayIndex: date.getUTCDay(),
    month: date.getUTCMonth(),
    isOutlier: isoDate === OUTLIER_DATE,
  };
}

/**
 * Build the complete deterministic 2025 coffee-purchase dataset.
 *
 * IDs are assigned only after chronological sorting, so `cup-0001` through
 * `cup-1000` remain stable even when records share the same hour.
 */
export function generateCoffeeData(seed = DATA_SEED) {
  const random = mulberry32(seed);
  const drafts = [];
  let sourceIndex = 0;

  allocateOrdinaryPurchases(random).forEach(({ isoDate, count }) => {
    for (let index = 0; index < count; index += 1) {
      const hour = weightedIndex(HOUR_WEIGHTS, random);
      drafts.push(createDraftRecord(isoDate, hour, random, sourceIndex));
      sourceIndex += 1;
    }
  });

  const outlierHours = [6, 7, 8, 9, 10, 13, 16];
  outlierHours.forEach((hour, index) => {
    const forcedType = index < 4 ? "espresso" : DRINK_TYPES[index - 3];
    drafts.push(
      createDraftRecord(OUTLIER_DATE, hour, random, sourceIndex, forcedType),
    );
    sourceIndex += 1;
  });

  drafts.sort((left, right) => (
    left.timestamp.localeCompare(right.timestamp)
    || left.sourceIndex - right.sourceIndex
  ));

  return drafts.map(({ sourceIndex: _sourceIndex, ...record }, index) => Object.freeze({
    id: `cup-${String(index + 1).padStart(4, "0")}`,
    ...record,
  }));
}

export const coffeeData = Object.freeze(generateCoffeeData());
