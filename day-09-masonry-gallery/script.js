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

/* ═══════════════════════════════════════════
   Image Loading
   ═══════════════════════════════════════════ */

/** Build the thumbnail URL scaled proportionally to CONFIG.thumbWidth */
function thumbUrl(id, origW, origH) {
  const w = CONFIG.thumbWidth;
  const h = Math.round((origH / origW) * w);
  return `${CONFIG.apiBase}/id/${id}/${w}/${h}`;
}

/** Build the full-resolution download URL */
function fullUrl(id, origW, origH) {
  return `${CONFIG.apiBase}/id/${id}/${origW}/${origH}`;
}

/** Create a single card element and append it to the masonry grid */
function createCard(img, index) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.index = state.images.length - CONFIG.batchSize + index;

  const ratio = img.width / img.height;
  const thumbH = Math.round(CONFIG.thumbWidth / ratio);

  card.innerHTML = `
    <div class="card-image-wrap" style="aspect-ratio: ${img.width}/${img.height}">
      <div class="skeleton"></div>
      <img
        src="${thumbUrl(img.id, img.width, img.height)}"
        alt="Photo by ${img.author}"
        width="${CONFIG.thumbWidth}"
        height="${thumbH}"
        loading="lazy"
      />
      <div class="card-overlay">
        <div class="card-overlay-row">
          <span class="card-dim">${img.width} × ${img.height}</span>
          <div class="card-actions">
            <button class="action-btn heart-btn" data-heart aria-label="Like">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <a class="action-btn download-btn" href="${fullUrl(img.id, img.width, img.height)}" download aria-label="Download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  /* Fade out skeleton when image loads */
  const imgEl = card.querySelector('img');
  imgEl.addEventListener('load', () => card.classList.add('loaded'));
  imgEl.addEventListener('error', () => card.classList.add('loaded'));

  dom.masonry.appendChild(card);
  return card;
}

/** Fetch a batch of images from the picsum API */
async function fetchBatch() {
  if (state.loading) return;
  state.loading = true;
  dom.loader.classList.add('active');

  try {
    const res = await fetch(
      `${CONFIG.apiBase}/v2/list?page=${state.page}&limit=${CONFIG.batchSize}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const batch = await res.json();
    state.images.push(...batch);
    state.totalImages += batch.length;
    state.page++;

    /* Update counter */
    const counter = $('[data-counter]');
    if (counter) counter.textContent = `${state.totalImages} images`;

    /* Create cards */
    batch.forEach((img, i) => createCard(img, i));
  } catch (err) {
    console.error('Failed to load images:', err);
  } finally {
    state.loading = false;
    dom.loader.classList.remove('active');
  }
}

/* ── Initial Load ─────────────────────────── */
fetchBatch();
