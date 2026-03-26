'use strict';

/* ═══════════════════════════════════════════
   Day 09 — Masonry Gallery
   ═══════════════════════════════════════════ */

/* ── DOM References ───────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  app:      $('[data-app]'),
  header:   $('[data-header]'),
  masonry:  $('[data-masonry]'),
  sentinel: $('[data-sentinel]'),
  loader:   $('[data-loader]'),
  lightbox: $('[data-lightbox]'),
};

/* ── State ────────────────────────────────── */
const state = {
  page: 1,
  loading: false,
  totalImages: 0,
  images: [],
};

/* ── Configuration ────────────────────────── */
const CONFIG = {
  batchSize: 12,
  apiBase: 'https://picsum.photos',
  thumbWidth: 600,
};
