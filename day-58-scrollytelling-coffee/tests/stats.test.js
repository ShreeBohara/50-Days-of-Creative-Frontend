import test from "node:test";
import assert from "node:assert/strict";

import { DRINK_TYPES, coffeeData } from "../js/data.js";
import {
  buildDrinkLegendItems,
  buildFinaleSummary,
  buildHourSeries,
  buildMonthSeries,
  buildTrendComparison,
  buildWeeklyDailyAverages,
  coffeeStats,
  summarizeDataset,
  summarizeCoffeeData,
} from "../js/stats.js";

test("drink legend items keep the canonical order and reconcile all cups", () => {
  const legend = buildDrinkLegendItems(coffeeStats);
  assert.deepEqual(legend.map(({ drink }) => drink), [...DRINK_TYPES]);
  assert.equal(legend.reduce((total, { count }) => total + count, 0), 1000);
  assert.equal(legend.reduce((total, { share }) => total + share, 0), 1);
});

test("monthly series covers January through December and preserves the vacation-shaped total", () => {
  const months = buildMonthSeries(coffeeStats);
  assert.equal(months.length, 12);
  assert.equal(months[0].month, "January");
  assert.equal(months[11].month, "December");
  assert.equal(months.reduce((total, { count }) => total + count, 0), 1000);
  assert.equal(Math.max(...months.map(({ count }) => count)), coffeeStats.busiestMonthCount);
});

test("hour series exposes all 24 densities and the summary peak", () => {
  const hours = buildHourSeries(coffeeStats);
  assert.equal(hours.length, 24);
  assert.equal(hours.reduce((total, { count }) => total + count, 0), 1000);
  assert.equal(hours.find(({ density }) => density === 1).hour, coffeeStats.peakHour);
  assert.ok(hours.filter(({ hour }) => hour >= 6 && hour < 12).every(({ density }) => density > 0));
});

test("trend comparison reports the intentionally rising second half", () => {
  const trend = buildTrendComparison(coffeeStats);
  assert.equal(trend.firstHalf + trend.secondHalf, 1000);
  assert.equal(trend.change, trend.secondHalf - trend.firstHalf);
  assert.equal(trend.direction, "up");
  assert.ok(trend.changeRate > 0);
});

test("finale copy is derived from the same summary as every chart", () => {
  const finale = buildFinaleSummary(coffeeStats);
  assert.equal(finale.headline, "1,000 cups");
  assert.match(finale.detail, /spent/);
  assert.match(finale.detail, new RegExp(coffeeStats.topDrink, "i"));
  assert.match(finale.detail, new RegExp(`${coffeeStats.peakHour % 12 || 12}:00`));
});

test("weekly trend has 52 ordered bins covering all 365 days and cups", () => {
  const bins = buildWeeklyDailyAverages(coffeeData);

  assert.equal(bins.length, 52);
  assert.equal(bins[0].startDate, "2025-01-01");
  assert.equal(bins[51].endDate, "2025-12-31");
  assert.equal(bins.reduce((total, bin) => total + bin.days, 0), 365);
  assert.equal(bins.reduce((total, bin) => total + bin.total, 0), 1000);

  bins.forEach((bin, index) => {
    assert.equal(bin.index, index);
    assert.equal(bin.week, index + 1);
    assert.equal(bin.dailyAverage, bin.total / bin.days);
    if (index > 0) assert.ok(bins[index - 1].endDate < bin.startDate);
  });

  assert.equal(bins[0].days, 7);
  assert.equal(bins[50].days, 7);
  assert.equal(bins[51].days, 8);
});

test("the summary reconciles every categorical and monetary total", () => {
  const summary = summarizeCoffeeData(coffeeData);
  const exactSpend = Number(
    coffeeData.reduce((total, { price }) => total + price, 0).toFixed(2),
  );

  assert.deepEqual(summary, coffeeStats);
  assert.deepEqual(summary, summarizeDataset(coffeeData));
  assert.equal(summary.totalCups, 1000);
  assert.equal(summary.totalSpent, exactSpend);
  assert.equal(summary.averagePrice, Number((exactSpend / 1000).toFixed(2)));
  assert.equal(summary.weeklyCupTotal, 1000);
  assert.equal(summary.outlierCups, 7);
  assert.equal(summary.peakWeekday, "Monday");
  assert.ok(summary.peakHour >= 6 && summary.peakHour < 12);
  assert.ok(summary.morningShare > 0.6);
  assert.ok(summary.secondHalfCups > summary.firstHalfCups);
  assert.ok(summary.trendSlope > 0);
  assert.equal(summary.busiestMonthCount, Math.max(...summary.monthCounts));
  assert.equal(summary.monthCounts.reduce((total, count) => total + count, 0), 1000);
  assert.equal(summary.hourCounts.reduce((total, count) => total + count, 0), 1000);
  assert.equal(
    Object.values(summary.weekdayCounts).reduce((total, count) => total + count, 0),
    1000,
  );
  assert.deepEqual(Object.keys(summary.typeCounts), [...DRINK_TYPES]);
  assert.equal(
    Object.values(summary.typeCounts).reduce((total, count) => total + count, 0),
    1000,
  );
});

test("empty input still produces a safe 52-bin summary", () => {
  const summary = summarizeCoffeeData([]);

  assert.equal(summary.totalCups, 0);
  assert.equal(summary.totalSpent, 0);
  assert.equal(summary.averagePrice, 0);
  assert.equal(summary.weeklyDailyAverages.length, 52);
  assert.equal(summary.weeklyCupTotal, 0);
});
