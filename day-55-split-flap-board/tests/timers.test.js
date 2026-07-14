import test from "node:test";
import assert from "node:assert/strict";

import { createDeparturesMode } from "../js/departuresMode.js";
import { createClockMode } from "../js/clockMode.js";
import { createQuotesMode } from "../js/quotesMode.js";

function createScheduler() {
  let nextId = 1;
  const jobs = new Map();
  return {
    set(fn, delay) {
      const id = nextId;
      nextId += 1;
      jobs.set(id, { fn, delay });
      return id;
    },
    clear(id) {
      jobs.delete(id);
    },
    runNext() {
      const entry = jobs.entries().next().value;
      if (!entry) return null;
      const [id, job] = entry;
      jobs.delete(id);
      job.fn();
      return job.delay;
    },
    get size() {
      return jobs.size;
    },
    get nextDelay() {
      return jobs.values().next().value?.delay ?? null;
    },
  };
}

test("departures schedule recursively and clean up on deactivation", () => {
  const scheduler = createScheduler();
  const frames = [];
  const mode = createDeparturesMode({
    getColumns: () => 22,
    setBoard: (lines) => frames.push(lines),
    setTimeoutFn: scheduler.set,
    clearTimeoutFn: scheduler.clear,
    random: () => 0,
  });
  mode.activate();
  assert.equal(scheduler.nextDelay, 8000);
  scheduler.runNext();
  assert.equal(frames.length, 2);
  assert.equal(scheduler.nextDelay, 8000);
  mode.deactivate();
  assert.equal(scheduler.size, 0);
});

test("clock and quote timers realign, recurse, and stop cleanly", () => {
  const clockScheduler = createScheduler();
  const date = new Date(2026, 6, 13, 9, 5, 7, 250);
  const clock = createClockMode({
    getColumns: () => 16,
    setBoard: () => {},
    now: () => date,
    setTimeoutFn: clockScheduler.set,
    clearTimeoutFn: clockScheduler.clear,
  });
  clock.activate();
  assert.equal(clockScheduler.nextDelay, 755);
  clockScheduler.runNext();
  assert.equal(clockScheduler.nextDelay, 755);
  clock.setHidden(true);
  assert.equal(clockScheduler.size, 0);

  const quoteScheduler = createScheduler();
  const quotes = createQuotesMode({
    getColumns: () => 12,
    setBoard: () => {},
    setTimeoutFn: quoteScheduler.set,
    clearTimeoutFn: quoteScheduler.clear,
  });
  quotes.activate();
  assert.equal(quoteScheduler.nextDelay, 12000);
  quoteScheduler.runNext();
  assert.equal(quotes.quoteIndex, 1);
  assert.equal(quoteScheduler.nextDelay, 12000);
  quotes.deactivate();
  assert.equal(quoteScheduler.size, 0);
});
