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

  /* Stagger delay for wave effect within each batch */
  card.style.setProperty('--stagger', `${index * 60}ms`);

  dom.masonry.appendChild(card);

  /* Observe for viewport entry animation */
  entryObserver.observe(card);

  return card;
}

/* ═══════════════════════════════════════════
   Viewport Entry Animations
   ═══════════════════════════════════════════ */

const entryObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        entryObserver.unobserve(entry.target);
      }
    });
  },
  {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.05,
  }
);

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

/* ═══════════════════════════════════════════
   Infinite Scroll — Intersection Observer
   ═══════════════════════════════════════════ */

const scrollObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !state.loading) {
      fetchBatch();
    }
  },
  {
    root: null,
    rootMargin: '0px 0px 600px 0px',
    threshold: 0,
  }
);

scrollObserver.observe(dom.sentinel);

/* ═══════════════════════════════════════════
   Hover Overlay Interactions
   ═══════════════════════════════════════════ */

/* Delegate click events on the masonry container */
dom.masonry.addEventListener('click', (e) => {
  /* Heart button */
  const heartBtn = e.target.closest('[data-heart]');
  if (heartBtn) {
    e.stopPropagation();
    heartBtn.classList.toggle('liked');
    return;
  }

  /* Download button — let the <a> default handle it */
  const dlBtn = e.target.closest('.download-btn');
  if (dlBtn) {
    e.stopPropagation();
    return;
  }

  /* Card click → open lightbox */
  const card = e.target.closest('.card');
  if (card) {
    const idx = parseInt(card.dataset.index, 10);
    if (!isNaN(idx)) openLightbox(idx);
  }
});

/* ═══════════════════════════════════════════
   Lightbox
   ═══════════════════════════════════════════ */

const lightboxEls = {
  wrap:    $('[data-lightbox]'),
  backdrop: $('[data-lightbox-backdrop]'),
  img:     $('[data-lightbox-img]'),
  close:   $('[data-lightbox-close]'),
  prev:    $('[data-lightbox-prev]'),
  next:    $('[data-lightbox-next]'),
  author:  $('[data-lightbox-author]'),
  counter: $('[data-lightbox-counter]'),
};

let lightboxIndex = -1;

function openLightbox(index) {
  lightboxIndex = index;
  updateLightboxImage();
  lightboxEls.wrap.classList.add('open');
  lightboxEls.wrap.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxEls.wrap.classList.remove('open');
  lightboxEls.wrap.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  lightboxIndex = -1;
}

function navigateLightbox(dir) {
  if (state.images.length === 0) return;
  lightboxIndex = (lightboxIndex + dir + state.images.length) % state.images.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const img = state.images[lightboxIndex];
  if (!img) return;

  /* Use a larger size for lightbox */
  const lbWidth = Math.min(img.width, 1400);
  const lbHeight = Math.round((img.height / img.width) * lbWidth);
  lightboxEls.img.src = `${CONFIG.apiBase}/id/${img.id}/${lbWidth}/${lbHeight}`;
  lightboxEls.img.alt = `Photo by ${img.author}`;
  lightboxEls.author.textContent = img.author;
  lightboxEls.counter.textContent = `${lightboxIndex + 1} / ${state.images.length}`;

  /* Preload adjacent images */
  [-1, 1].forEach((offset) => {
    const adjIdx = (lightboxIndex + offset + state.images.length) % state.images.length;
    const adj = state.images[adjIdx];
    if (adj) {
      const pre = new Image();
      const pw = Math.min(adj.width, 1400);
      const ph = Math.round((adj.height / adj.width) * pw);
      pre.src = `${CONFIG.apiBase}/id/${adj.id}/${pw}/${ph}`;
    }
  });
}

/* Lightbox event listeners */
lightboxEls.close.addEventListener('click', closeLightbox);
lightboxEls.backdrop.addEventListener('click', closeLightbox);
lightboxEls.prev.addEventListener('click', () => navigateLightbox(-1));
lightboxEls.next.addEventListener('click', () => navigateLightbox(1));

document.addEventListener('keydown', (e) => {
  if (lightboxIndex < 0) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

/* ── Touch Swipe Support (Lightbox) ───────── */
let touchStartX = 0;
let touchStartY = 0;

lightboxEls.wrap.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

lightboxEls.wrap.addEventListener('touchend', (e) => {
  if (lightboxIndex < 0) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  /* Only trigger if horizontal swipe dominates */
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    navigateLightbox(dx < 0 ? 1 : -1);
  }
}, { passive: true });

/* ── Initial Load ─────────────────────────── */
fetchBatch();
