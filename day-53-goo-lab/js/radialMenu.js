// radialMenu.js — SPECIMEN 01
// A FAB whose 5 items ooze outward along an arc. Two stacked layers share the
// exact same transforms: a goo-filtered layer of plain colour blobs (which fuse
// into liquid bridges as items separate) and an un-filtered layer of crisp icons.

import { el, svgEl } from './util.js';

// 24×24 stroke icons (paths only) — kept crisp on the un-filtered UI layer.
const ITEMS = [
  { label: 'Add',   d: 'M12 5v14M5 12h14' },
  { label: 'Like',  d: 'M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9z' },
  { label: 'Star',  d: 'M12 4l2.35 4.76 5.25.76-3.8 3.7.9 5.24L12 16.9 7.1 19.2l.9-5.24-3.8-3.7 5.25-.76z' },
  { label: 'Share', d: 'M12 3v12M8 7l4-4 4 4M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4' },
  { label: 'Tune',  d: 'M5 8h9M17 8h2M5 16h2M10 16h9M15 6v4M8 14v4' },
];

const R = 132;              // fan radius (px)
const N = ITEMS.length;

function iconSvg(d) {
  const path = svgEl('path', {
    d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  return svgEl('svg', { viewBox: '0 0 24 24', class: 'radial-icon', 'aria-hidden': 'true' }, [path]);
}

// Blob (goo layer) + button (ui layer) for one item, sharing the same --x/--y.
function makeItem(item, i) {
  // Upper semicircle fan: 180°→360° so every item rises above the FAB.
  const a = (Math.PI) + (i / (N - 1)) * Math.PI;
  const x = Math.round(Math.cos(a) * R);
  const y = Math.round(Math.sin(a) * R);
  const style = { '--x': `${x}px`, '--y': `${y}px`, '--i': String(i) };

  const blob = el('span', { class: 'radial-blob radial-blob--item', style });
  const btn = el('button', {
    class: 'radial-item', style,
    type: 'button', 'aria-label': item.label, title: item.label, tabindex: -1,
  }, [iconSvg(item.d)]);
  return { blob, btn };
}

export function mountRadialMenu(stage) {
  const gooLayer = el('div', { class: 'radial-goo' });
  const uiLayer = el('div', { class: 'radial-ui' });

  const fabBlob = el('span', { class: 'radial-blob radial-blob--fab' });
  const fab = el('button', {
    class: 'radial-fab', type: 'button',
    'aria-expanded': 'false', 'aria-label': 'Open actions',
  }, [iconSvg('M12 5v14M5 12h14')]);

  gooLayer.appendChild(fabBlob);
  uiLayer.appendChild(fab);

  const items = ITEMS.map(makeItem);
  for (const { blob } of items) gooLayer.appendChild(blob);
  for (const { btn } of items) uiLayer.appendChild(btn);

  const root = el('div', { class: 'radial' }, [gooLayer, uiLayer]);

  let open = false;
  const setOpen = (next) => {
    open = next;
    root.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Close actions' : 'Open actions');
    for (const { btn } of items) btn.tabIndex = open ? 0 : -1;
  };

  fab.addEventListener('click', () => setOpen(!open));
  // click-away closes
  document.addEventListener('click', (e) => {
    if (open && !root.contains(e.target)) setOpen(false);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { setOpen(false); fab.focus(); }
  });

  stage.appendChild(root);
}
