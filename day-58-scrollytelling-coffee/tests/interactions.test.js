import assert from "node:assert/strict";
import test from "node:test";

import {
  findNearestParticle,
  formatCoffeeTooltip,
  gridIndexForKey,
  positionTooltip,
} from "../js/interactions.js";

test("grid keyboard navigation respects rows and dataset boundaries", () => {
  assert.equal(gridIndexForKey(0, "ArrowLeft"), 0);
  assert.equal(gridIndexForKey(0, "ArrowDown"), 40);
  assert.equal(gridIndexForKey(41, "Home"), 40);
  assert.equal(gridIndexForKey(41, "End"), 79);
  assert.equal(gridIndexForKey(999, "ArrowRight"), 999);
  assert.equal(gridIndexForKey(999, "ArrowUp"), 959);
});

test("nearest-particle hit testing rejects pointers outside its threshold", () => {
  const particles = [{ x: 10, y: 10 }, { x: 40, y: 40 }];
  assert.equal(findNearestParticle(particles, 12, 11, 8), 0);
  assert.equal(findNearestParticle(particles, 38, 42, 8), 1);
  assert.equal(findNearestParticle(particles, 25, 25, 8), -1);
});

test("tooltip copy and position remain deterministic and in bounds", () => {
  assert.deepEqual(
    formatCoffeeTooltip({
      date: "2025-09-16",
      hour: 8,
      minute: 5,
      drink: "espresso",
      price: 3.25,
    }),
    {
      title: "Espresso",
      detail: "Tue, Sep 16 · 8:05 AM · $3.25",
    },
  );
  assert.deepEqual(
    positionTooltip({ x: 310, y: 8 }, { width: 120, height: 60 }, { width: 320, height: 180 }),
    { x: 188, y: 12 },
  );
});
