import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPORT_WIDTH, EXPORT_HEIGHT, FALLBACK_WIDTH, FALLBACK_HEIGHT, exportScale, createExportFileName,
} from "../js/exportPng.js";
import { POSTER_W, POSTER_H } from "../js/poster.js";

test("export sizes are 3:4 and the print size is exactly 2× poster units", () => {
  assert.equal(EXPORT_WIDTH, 2400);
  assert.equal(EXPORT_HEIGHT, 3200);
  assert.equal(EXPORT_WIDTH / EXPORT_HEIGHT, POSTER_W / POSTER_H);
  assert.equal(FALLBACK_WIDTH / FALLBACK_HEIGHT, POSTER_W / POSTER_H);
  assert.equal(exportScale(), 2);
  assert.equal(exportScale(FALLBACK_WIDTH), 1.5);
});

test("file names carry the code and a safe headline slug", () => {
  assert.equal(createExportFileName("SWS-7K2Q-C", "Night Shift!"), "poster-63-SWS-7K2Q-C-night-shift.png");
  assert.equal(createExportFileName("", ""), "poster-63-poster-poster.png");
  assert.equal(createExportFileName("A/B", "x"), "poster-63-AB-x.png");
});
