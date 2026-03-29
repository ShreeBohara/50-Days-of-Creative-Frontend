/* ── SVG Draw-On-Scroll ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ── Easing ──────────────────────────────────────────── */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /* ── Hero letter path lengths ─────────────────────────── */
  document.querySelectorAll('.hero-letter').forEach(letter => {
    const len = letter.getTotalLength();
    letter.style.setProperty('--len', len);
  });

  /* ── Gather all drawable paths ───────────────────────── */
  const scenes = document.querySelectorAll('.scene:not(.scene--hero)');
  const pathDataMap = new Map();

  scenes.forEach(scene => {
    const paths = scene.querySelectorAll('[data-draw]');
    const pathEntries = [];

    paths.forEach(path => {
      const length = path.getTotalLength();
      const delay = parseFloat(path.getAttribute('data-delay') || '0');

      // Store original dash array if it has one (for dashed lines)
      const origDash = path.getAttribute('stroke-dasharray');
      const isDashed = origDash && origDash.includes(' ');

      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;

      pathEntries.push({ el: path, length, delay, isDashed, origDash });
    });

    pathDataMap.set(scene, pathEntries);
  });

  /* ── Parallax elements ────────────────────────────────── */
  const parallaxEls = document.querySelectorAll('[data-speed]');

  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) * parseFloat(el.dataset.speed);
      el.style.transform = `translateY(${offset}px)`;
    });
  }

  /* ── Scroll-driven draw ──────────────────────────────── */
  let ticking = false;

  function getSceneProgress(scene) {
    const rect = scene.getBoundingClientRect();
    const vh = window.innerHeight;
    // Start drawing when section top enters bottom of viewport
    // Fully drawn when section center reaches viewport center
    const start = vh;            // rect.top == vh → progress 0
    const end = vh * 0.1;       // rect.top == 10% from top → progress 1
    const raw = (start - rect.top) / (start - end);
    return Math.max(0, Math.min(1, raw));
  }

  function updateDrawAnimations() {
    scenes.forEach(scene => {
      const progress = getSceneProgress(scene);
      const paths = pathDataMap.get(scene);
      if (!paths) return;

      paths.forEach(({ el, length, delay }) => {
        // Each path has its own delay window within the 0-1 progress
        const pathStart = delay;
        const pathEnd = Math.min(delay + 0.6, 1);
        const pathProgress = Math.max(0, Math.min(1, (progress - pathStart) / (pathEnd - pathStart)));
        const eased = easeOutCubic(pathProgress);

        el.style.strokeDashoffset = length * (1 - eased);
      });
    });
  }

  /* ── Progress indicator ──────────────────────────────── */
  const progressFill = document.querySelector('[data-progress-fill]');

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressFill.style.height = pct + '%';
  }

  /* ── Unified scroll handler ────────────────────────── */
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateDrawAnimations();
        updateParallax();
        updateProgress();
        ticking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Nav Dots ──────────────────────────────────────── */
  const navDots = document.querySelectorAll('[data-nav-dot]');
  const allScenes = document.querySelectorAll('[data-scene]');

  // Click to scroll
  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = document.querySelector(`[data-scene="${dot.dataset.navDot}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // IntersectionObserver to track active section
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sceneName = entry.target.dataset.scene;
        navDots.forEach(d => d.classList.toggle('active', d.dataset.navDot === sceneName));
      }
    });
  }, { threshold: 0.4 });

  allScenes.forEach(scene => navObserver.observe(scene));

  // Initial call
  updateDrawAnimations();
  updateParallax();
  updateProgress();
});
