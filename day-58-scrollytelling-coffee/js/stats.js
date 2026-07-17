import {
  DATA_YEAR,
  DRINK_TYPES,
  OUTLIER_DATE,
  coffeeData,
} from "./data.js";

const MS_PER_DAY = 86_400_000;
const WEEKDAY_ORDER = Object.freeze([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);
export const MONTH_NAMES = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]);

function isoDateFromUtc(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Split a calendar year into exactly 52 chronological display bins.
 * Bins 1–51 contain seven days; bin 52 contains the final eight days in 2025.
 * This keeps every purchase in the trend while preserving the requested
 * 52-point line. `dailyAverage` is always normalized by the bin's actual days.
 */
export function buildWeeklyDailyAverages(records, year = DATA_YEAR) {
  const binCount = 52;
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1);
  const daysInYear = Math.round((yearEnd - yearStart) / MS_PER_DAY);
  const bins = Array.from({ length: binCount }, (_, index) => {
    const startDay = index * 7;
    const endDay = index === binCount - 1
      ? daysInYear - 1
      : Math.min(startDay + 6, daysInYear - 1);

    return {
      index,
      week: index + 1,
      startDate: isoDateFromUtc(yearStart + startDay * MS_PER_DAY),
      endDate: isoDateFromUtc(yearStart + endDay * MS_PER_DAY),
      days: endDay - startDay + 1,
      total: 0,
      dailyAverage: 0,
    };
  });

  records.forEach((record) => {
    const recordTime = Date.parse(`${record.date}T00:00:00.000Z`);
    if (!Number.isFinite(recordTime) || recordTime < yearStart || recordTime >= yearEnd) {
      return;
    }

    const dayIndex = Math.floor((recordTime - yearStart) / MS_PER_DAY);
    const binIndex = Math.min(binCount - 1, Math.floor(dayIndex / 7));
    bins[binIndex].total += 1;
  });

  return bins.map((bin) => Object.freeze({
    ...bin,
    dailyAverage: bin.total / bin.days,
  }));
}

function countsForKeys(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

export function buildDrinkLegendItems(summary) {
  const counts = summary?.typeCounts ?? {};
  const total = Number(summary?.totalCups) || 0;

  return DRINK_TYPES.map((drink) => Object.freeze({
    drink,
    count: Number(counts[drink]) || 0,
    share: total ? (Number(counts[drink]) || 0) / total : 0,
  }));
}

export function buildMonthSeries(summary) {
  return MONTH_NAMES.map((month, index) => Object.freeze({
    month,
    shortMonth: month.slice(0, 3),
    count: Number(summary?.monthCounts?.[index]) || 0,
  }));
}

export function buildHourSeries(summary) {
  const counts = summary?.hourCounts ?? [];
  const maximum = Math.max(...counts, 1);
  return Array.from({ length: 24 }, (_, hour) => Object.freeze({
    hour,
    count: Number(counts[hour]) || 0,
    density: (Number(counts[hour]) || 0) / maximum,
  }));
}

function indexOfMaximum(values) {
  let maximumIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[maximumIndex]) maximumIndex = index;
  }
  return maximumIndex;
}

function linearSlope(values) {
  if (values.length < 2) return 0;

  const meanX = (values.length - 1) / 2;
  const meanY = sum(values) / values.length;
  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    const offset = index - meanX;
    numerator += offset * (value - meanY);
    denominator += offset * offset;
  });

  return denominator ? numerator / denominator : 0;
}

export function summarizeDataset(records) {
  const typeCounts = countsForKeys(DRINK_TYPES);
  const weekdayCounts = countsForKeys(WEEKDAY_ORDER);
  const monthCounts = Array(12).fill(0);
  const hourCounts = Array(24).fill(0);
  let totalSpent = 0;

  records.forEach((record) => {
    const drink = record.drink ?? record.drinkType;
    if (drink in typeCounts) typeCounts[drink] += 1;
    weekdayCounts[record.weekday] += 1;
    monthCounts[record.month] += 1;
    hourCounts[record.hour] += 1;
    totalSpent += record.price;
  });

  const roundedSpend = Number(totalSpent.toFixed(2));
  const weeklyDailyAverages = buildWeeklyDailyAverages(records);
  const peakHour = indexOfMaximum(hourCounts);
  const weekdayValues = WEEKDAY_ORDER.map((weekday) => weekdayCounts[weekday]);
  const topDrinkIndex = indexOfMaximum(DRINK_TYPES.map((drink) => typeCounts[drink]));
  const busiestMonthIndex = indexOfMaximum(monthCounts);
  const morningCups = hourCounts.slice(6, 12).reduce((total, count) => total + count, 0);
  const firstHalfCups = monthCounts.slice(0, 6).reduce((total, count) => total + count, 0);
  const secondHalfCups = records.length - firstHalfCups;

  return Object.freeze({
    totalCups: records.length,
    totalSpent: roundedSpend,
    averagePrice: records.length
      ? Number((roundedSpend / records.length).toFixed(2))
      : 0,
    typeCounts: Object.freeze(typeCounts),
    weekdayCounts: Object.freeze(weekdayCounts),
    monthCounts: Object.freeze(monthCounts),
    hourCounts: Object.freeze(hourCounts),
    peakHour,
    peakWeekday: WEEKDAY_ORDER[indexOfMaximum(weekdayValues)],
    topDrink: DRINK_TYPES[topDrinkIndex],
    topDrinkShare: records.length ? typeCounts[DRINK_TYPES[topDrinkIndex]] / records.length : 0,
    busiestMonth: MONTH_NAMES[busiestMonthIndex],
    busiestMonthCount: monthCounts[busiestMonthIndex],
    morningCups,
    morningShare: records.length ? morningCups / records.length : 0,
    firstHalfCups,
    secondHalfCups,
    dailyAverage: records.length / 365,
    outlierCups: records.filter(({ date }) => date === OUTLIER_DATE).length,
    weeklyDailyAverages: Object.freeze(weeklyDailyAverages),
    weeklyCupTotal: sum(weeklyDailyAverages.map(({ total }) => total)),
    trendSlope: linearSlope(weeklyDailyAverages.map(({ dailyAverage }) => dailyAverage)),
  });
}

export const summarizeCoffeeData = summarizeDataset;
export const coffeeStats = summarizeDataset(coffeeData);
