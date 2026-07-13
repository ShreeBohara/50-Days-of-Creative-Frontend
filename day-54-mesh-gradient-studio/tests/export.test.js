import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  createExportFileName,
} from "../js/exportPng.js";

test("wallpaper export dimensions and filename are stable", () => {
  assert.equal(EXPORT_WIDTH, 1920);
  assert.equal(EXPORT_HEIGHT, 1080);
  assert.equal(
    createExportFileName("aurora", new Date("2026-07-12T20:10:05.123Z")),
    "mesh-54-aurora-2026-07-12T20-10-05-123Z.png",
  );
});
