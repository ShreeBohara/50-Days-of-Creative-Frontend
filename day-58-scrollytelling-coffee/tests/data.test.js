import test from "node:test";
import assert from "node:assert/strict";

import {
  DATA_SEED,
  DATA_YEAR,
  DRINK_TYPES,
  OUTLIER_DATE,
  TYPE_PRICES,
  VACATION_END,
  VACATION_START,
  coffeeData,
  generateCoffeeData,
} from "../js/data.js";

test("the seeded generator returns the same exact 1,000 records", () => {
  const first = generateCoffeeData(DATA_SEED);
  const second = generateCoffeeData(DATA_SEED);

  assert.equal(first.length, 1000);
  assert.deepEqual(first, second);
  assert.deepEqual(first, coffeeData);
  assert.notDeepEqual(generateCoffeeData(DATA_SEED + 1), first);
});

test("records contain valid story fields, five drink types, and type prices", () => {
  const observedTypes = new Set();

  coffeeData.forEach((record) => {
    assert.match(record.id, /^cup-\d{4}$/);
    assert.match(record.date, /^2025-\d{2}-\d{2}$/);
    assert.equal(new Date(`${record.date}T00:00:00.000Z`).getUTCFullYear(), DATA_YEAR);
    assert.ok(Number.isInteger(record.hour) && record.hour >= 0 && record.hour <= 23);
    assert.ok(Number.isInteger(record.minute) && record.minute >= 0 && record.minute <= 59);
    assert.equal(typeof record.weekday, "string");
    assert.ok(Number.isInteger(record.weekdayIndex));
    assert.ok(Number.isInteger(record.month) && record.month >= 0 && record.month <= 11);
    assert.equal(record.drink, record.drinkType);
    assert.ok(TYPE_PRICES[record.drinkType].includes(record.price));
    observedTypes.add(record.drinkType);
  });

  assert.deepEqual([...observedTypes].sort(), [...DRINK_TYPES].sort());
});

test("chronological IDs stay stable and strictly sequential", () => {
  coffeeData.forEach((record, index) => {
    assert.equal(record.id, `cup-${String(index + 1).padStart(4, "0")}`);
    if (index > 0) {
      assert.ok(coffeeData[index - 1].timestamp <= record.timestamp);
    }
  });
});

test("the vacation is empty and the Tuesday outlier has exactly seven cups", () => {
  const dailyCounts = new Map();
  coffeeData.forEach(({ date }) => {
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
    assert.ok(date < VACATION_START || date > VACATION_END);
  });

  assert.equal(new Date(`${OUTLIER_DATE}T00:00:00.000Z`).getUTCDay(), 2);
  assert.equal(dailyCounts.get(OUTLIER_DATE), 7);
  assert.ok(coffeeData.filter(({ date }) => date === OUTLIER_DATE).every(({ isOutlier }) => isOutlier));

  for (const [date, count] of dailyCounts) {
    if (date !== OUTLIER_DATE) assert.ok(count <= 6);
  }
});

test("morning, Monday, and later-year patterns are visibly baked in", () => {
  const morningCount = coffeeData.filter(({ hour }) => hour >= 6 && hour < 12).length;
  const firstHalf = coffeeData.filter(({ month }) => month < 6).length;
  const secondHalf = coffeeData.length - firstHalf;
  const weekdayCounts = Object.groupBy
    ? Object.groupBy(coffeeData, ({ weekday }) => weekday)
    : coffeeData.reduce((groups, record) => {
      (groups[record.weekday] ??= []).push(record);
      return groups;
    }, {});
  const mondayCount = weekdayCounts.Monday.length;
  const busiestOtherWeekday = Math.max(
    ...Object.entries(weekdayCounts)
      .filter(([weekday]) => weekday !== "Monday")
      .map(([, records]) => records.length),
  );

  assert.ok(morningCount / coffeeData.length > 0.6);
  assert.ok(mondayCount > busiestOtherWeekday);
  assert.ok(secondHalf > firstHalf);
});
