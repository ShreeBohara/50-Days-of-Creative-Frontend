// util.js — tiny shared helpers for the Goo Lab.
// No libraries: DOM is built with createElement / createElementNS (never innerHTML),
// randomness is seeded so the lab looks the same on every reload.

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an HTML element with attributes + optional children. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

/** Create a namespaced SVG element (paths, circles, filters, …). */
export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs, true);
  appendAll(node, children);
  return node;
}

function applyAttrs(node, attrs, isSvg = false) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.setAttribute('class', value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') throw new Error('util: use text/children, not html');
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (isSvg) node.setAttribute(key, value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
}

function appendAll(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

/** Deterministic 32-bit PRNG (mulberry32) → () => float in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth eased 0→1 (cubic in-out). */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Overshooting ease (back-out) for that springy settle. */
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run `fn(active)` when an element enters/leaves the viewport.
 * Used to pause the heavy canvas loops while off-screen.
 */
export function onVisible(target, fn, opts = { threshold: 0.05 }) {
  if (!('IntersectionObserver' in window)) {
    fn(true);
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) fn(e.isIntersecting);
  }, opts);
  io.observe(target);
  return () => io.disconnect();
}
