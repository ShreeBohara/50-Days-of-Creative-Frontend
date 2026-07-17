import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeScene,
  DRINK_COLORS,
  DRINK_ORDER,
  SCENE_IDS,
} from '../js/scenes.js';
import { coffeeData } from '../js/data.js';
import { coffeeStats } from '../js/stats.js';

const DAY_MS = 86_400_000;
const OUTLIER_DATE = '2025-09-16';

function createRecords() {
  const records = [];
  const forbidden = new Set([
    OUTLIER_DATE,
    ...Array.from({ length: 9 }, (_, index) => `2025-12-${String(index + 20).padStart(2, '0')}`),
  ]);

  for (let index = 0; index < 993; index += 1) {
    let dayIndex = (index * 73 + Math.floor(index / 365) * 19) % 365;
    let date = isoDate(dayIndex);
    while (forbidden.has(date)) {
      dayIndex = (dayIndex + 1) % 365;
      date = isoDate(dayIndex);
    }
    records.push({
      id: `regular-${String(index).padStart(4, '0')}`,
      date,
      hour: (index * 7) % 24,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
      drink: DRINK_ORDER[index % DRINK_ORDER.length],
      price: 2.5 + (index % 8) * 0.45,
    });
  }

  for (let index = 0; index < 7; index += 1) {
    records.push({
      id: `outlier-${index}`,
      date: OUTLIER_DATE,
      hour: 7 + index,
      weekday: 2,
      drink: DRINK_ORDER[index % DRINK_ORDER.length],
      price: 3.25 + index * 0.25,
    });
  }

  return records.sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.hour - right.hour || left.id.localeCompare(right.id),
  );
}

function isoDate(dayIndex) {
  return new Date(Date.UTC(2025, 0, 1) + dayIndex * DAY_MS).toISOString().slice(0, 10);
}

const records = createRecords();
const stats = {
  outlierDate: OUTLIER_DATE,
  peakHour: { hour: 8 },
  topDrink: { drink: 'latte' },
  totalSpend: records.reduce((sum, record) => sum + record.price, 0),
};

test('all eight scenes return 1,000 finite, in-bounds targets at desktop and mobile sizes', () => {
  const viewports = [
    { width: 760, height: 900 },
    { width: 375, height: 280 },
  ];

  for (const bounds of viewports) {
    for (const id of SCENE_IDS) {
      const scene = computeScene(id, records, stats, bounds);
      assert.equal(scene.id, id);
      assert.equal(scene.targets.length, 1000);
      assert.ok(Array.isArray(scene.overlays));
      assert.ok(scene.overlays.length > 0);

      for (const target of scene.targets) {
        assert.ok(Number.isFinite(target.x), `${id} has a finite x`);
        assert.ok(Number.isFinite(target.y), `${id} has a finite y`);
        assert.ok(Number.isFinite(target.r), `${id} has a finite radius`);
        assert.equal(target.radius, target.r, `${id} exposes the engine radius alias`);
        assert.ok(Number.isFinite(target.alpha), `${id} has a finite alpha`);
        assert.ok(target.x >= 0 && target.x <= bounds.width, `${id} x is inside its viewport`);
        assert.ok(target.y >= 0 && target.y <= bounds.height, `${id} y is inside its viewport`);
        assert.ok(target.r > 0);
        assert.ok(target.alpha >= 0 && target.alpha <= 1);
        assert.ok(target.recordId !== undefined);
      }
    }
  }
});

test('scene layouts consume the production drinkType records and summary shape', () => {
  const drinks = computeScene('drinks', coffeeData, coffeeStats, { width: 760, height: 760 });
  const finale = computeScene('finale', coffeeData, coffeeStats, { width: 760, height: 760 });
  const labels = drinks.overlays.filter((item) => item.type === 'cluster-label');
  const title = finale.overlays.find((item) => item.type === 'title-card');
  const expectedTopDrink = Object.entries(coffeeStats.typeCounts).sort((a, b) => b[1] - a[1])[0][0];

  assert.deepEqual(
    Object.fromEntries(labels.map((label) => [label.drink, label.count])),
    coffeeStats.typeCounts,
  );
  assert.match(title.detail, new RegExp(expectedTopDrink, 'i'));
  assert.equal(drinks.targets.filter((target) => target.group === 'filter').length, coffeeStats.typeCounts.filter);
});

test('layouts are deterministic and accept narrative aliases and step numbers', () => {
  const bounds = { width: 720, height: 760 };
  assert.deepEqual(
    computeScene('intro', records, stats, bounds),
    computeScene('cloud', records, stats, bounds),
  );
  assert.equal(computeScene(2, records, stats, bounds).id, 'grid');
  assert.equal(computeScene('step-8', records, stats, bounds).id, 'finale');
  assert.deepEqual(
    computeScene('clock', records, stats, bounds),
    computeScene('clock', records, stats, bounds),
  );
});

test('grid is an exact chronological 40 by 25 field', () => {
  const scene = computeScene('grid', records, stats, { width: 820, height: 700 });
  const xs = new Set(scene.targets.map((target) => target.x.toFixed(8)));
  const ys = new Set(scene.targets.map((target) => target.y.toFixed(8)));
  const overlay = scene.overlays.find((item) => item.type === 'grid-frame');

  assert.equal(xs.size, 40);
  assert.equal(ys.size, 25);
  assert.equal(overlay.columns, 40);
  assert.equal(overlay.rows, 25);
  scene.targets.forEach((target, index) => {
    assert.equal(target.column, index % 40);
    assert.equal(target.row, Math.floor(index / 40));
    assert.equal(target.recordId, records[index].id);
  });
});

test('drink state creates five color-coded, labeled groups', () => {
  const scene = computeScene('drinks', records, stats, { width: 800, height: 800 });
  const labels = scene.overlays.filter((item) => item.type === 'cluster-label');

  assert.deepEqual(labels.map((label) => label.drink), DRINK_ORDER);
  assert.equal(labels.reduce((sum, label) => sum + label.count, 0), 1000);
  scene.targets.forEach((target, index) => {
    assert.equal(target.group, records[index].drink);
    assert.equal(target.color, DRINK_COLORS[records[index].drink]);
  });

  const centers = new Set(labels.map((label) => `${label.x.toFixed(2)}:${label.y.toFixed(2)}`));
  assert.equal(centers.size, 5);
});

test('month state preserves all records in twelve stacked bars', () => {
  const scene = computeScene('months', records, stats, { width: 920, height: 720 });
  const axis = scene.overlays.find((item) => item.type === 'month-axis');
  const gap = scene.overlays.find((item) => item.id === 'vacation-gap');
  const expected = Array(12).fill(0);
  const actual = Array(12).fill(0);

  records.forEach((record) => {
    expected[Number(record.date.slice(5, 7)) - 1] += 1;
  });
  scene.targets.forEach((target) => {
    actual[target.month] += 1;
    assert.ok(Number.isInteger(target.layer));
  });

  assert.deepEqual(actual, expected);
  assert.equal(axis.labels.length, 12);
  assert.deepEqual(axis.labels.map((label) => label.count), expected);
  assert.match(gap.text, /Dec 20—28/);
});

test('clock state publishes all twenty-four densities and assigns every dot to its hour', () => {
  const scene = computeScene('clock', records, stats, { width: 720, height: 720 });
  const clock = scene.overlays.find((item) => item.type === 'clock-face');

  assert.equal(clock.hours.length, 24);
  assert.equal(clock.hours.reduce((sum, hour) => sum + hour.count, 0), 1000);
  scene.targets.forEach((target, index) => {
    assert.equal(target.hour, records[index].hour);
    assert.equal(target.density, clock.hours[target.hour].density);
  });
});

test('trend state exposes a 52-point line and area with matching weekly totals', () => {
  const scene = computeScene('trend', records, stats, { width: 900, height: 680 });
  const line = scene.overlays.find((item) => item.type === 'trend-line');
  const area = scene.overlays.find((item) => item.type === 'trend-area');
  const targetCounts = Array(52).fill(0);

  scene.targets.forEach((target) => {
    targetCounts[target.week] += 1;
  });

  assert.equal(line.points.length, 52);
  assert.equal(area.points.length, 52);
  assert.equal(line.points.reduce((sum, point, week) => sum + point.average * (week === 51 ? 8 : 7), 0), 1000);
  assert.deepEqual(
    line.points.map((point, week) => point.average * (week === 51 ? 8 : 7)),
    targetCounts,
  );
});

test('outlier state dims the field and emphasizes exactly seven purchases', () => {
  const scene = computeScene('outlier', records, stats, { width: 880, height: 720 });
  const highlighted = scene.targets.filter((target) => target.highlighted);
  const regular = scene.targets.filter((target) => !target.highlighted);
  const annotation = scene.overlays.find((item) => item.id === 'seven-cup-outlier');

  assert.equal(highlighted.length, 7);
  assert.ok(highlighted.every((target) => target.pulse && target.color === '#b43b2f'));
  assert.ok(highlighted.every((target) => records.find((record) => record.id === target.recordId).date === OUTLIER_DATE));
  assert.ok(regular.every((target) => target.alpha <= 0.12));
  assert.match(annotation.text, /7 coffees/);
});

test('finale maps all points across the cup, handle, saucer, and steam paths', () => {
  const scene = computeScene('finale', records, stats, { width: 760, height: 820 });
  const counts = Object.fromEntries(
    ['cup', 'handle', 'saucer', 'steam'].map((part) => [
      part,
      scene.targets.filter((target) => target.part === part).length,
    ]),
  );
  const key = scene.overlays.find((item) => item.type === 'constellation-key');
  const title = scene.overlays.find((item) => item.type === 'title-card');

  assert.deepEqual(counts, { cup: 500, handle: 150, saucer: 170, steam: 180 });
  assert.deepEqual(key.parts, counts);
  assert.match(title.title, /1,000/);
  assert.match(title.detail, /Latte/);
});

test('invalid input fails early instead of leaking NaN into the renderer', () => {
  assert.throws(
    () => computeScene('grid', records.slice(1), stats, { width: 800, height: 600 }),
    /exactly 1000 records/,
  );
  assert.throws(() => computeScene('unknown', records, stats, { width: 800, height: 600 }), /Unknown scene/);
  assert.throws(() => computeScene('grid', records, stats, { width: 0, height: 600 }), /positive finite/);
});
