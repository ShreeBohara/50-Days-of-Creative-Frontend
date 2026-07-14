import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DEPARTURES,
  chooseNextStatus,
  formatDepartures,
  updateRandomDeparture,
} from "../js/departuresMode.js";
import {
  formatClockBoard,
  formatClockDate,
  formatClockTime,
  millisecondsToNextSecond,
} from "../js/clockMode.js";
import { formatQuoteBoard, PLATFORM_QUOTES } from "../js/quotesMode.js";

test("departure layouts fill every supported board width", () => {
  for (const columns of [12, 16, 22]) {
    const lines = formatDepartures(DEFAULT_DEPARTURES, columns);
    assert.equal(lines.length, 6);
    lines.forEach((line) => assert.equal(line.length, columns));
  }
});

test("a departure tick changes exactly one row to a different status", () => {
  assert.notEqual(chooseNextStatus("ON TIME", () => 0), "ON TIME");
  const update = updateRandomDeparture(DEFAULT_DEPARTURES, () => 0);
  assert.equal(update.index, 0);
  assert.notEqual(update.previousStatus, update.nextStatus);
  assert.equal(
    update.services.filter((service, index) => service.status !== DEFAULT_DEPARTURES[index].status).length,
    1,
  );
});

test("the station clock uses local 24-hour fields and real-second alignment", () => {
  const date = new Date(2026, 6, 13, 9, 5, 7, 250);
  assert.equal(formatClockTime(date), "09:05:07");
  assert.equal(formatClockDate(date), "MON 13 JUL");
  assert.equal(millisecondsToNextSecond(date.getTime()), 755);
  for (const columns of [12, 16, 22]) {
    const lines = formatClockBoard(date, columns);
    assert.equal(lines.length, 6);
    lines.filter(Boolean).forEach((line) => assert.equal(line.length, columns));
  }
});

test("every original Platform 55 quote fits the smallest board", () => {
  assert.equal(PLATFORM_QUOTES.length, 6);
  PLATFORM_QUOTES.forEach((quote) => {
    const lines = formatQuoteBoard(quote, 12);
    assert.equal(lines.length, 6);
    lines.filter(Boolean).forEach((line) => assert.equal(line.length, 12));
    assert.match(lines.at(-1), /PLATFORM 55/);
  });
});
