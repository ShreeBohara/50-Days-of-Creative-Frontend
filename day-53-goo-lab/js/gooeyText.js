// gooeyText.js — SPECIMEN 04
// A word whose letters live under the #goo-text filter, so their blurred edges
// fuse into liquid bridges. Hovering spreads the letters apart (they visibly
// melt/unmelt); the viscosity slider drives the filter's blur radius live.

import { el } from './util.js';

export function mountGooeyText(stage, word = 'GOOEY') {
  const letters = [...word];
  const mid = (letters.length - 1) / 2;

  const cells = letters.map((ch, i) => {
    const glyph = el('span', { class: 'gtext-glyph' }, ch === ' ' ? ' ' : ch);
    // --i is the signed distance from the middle letter → symmetric spread on hover
    return el('span', { class: 'gtext-cell', style: { '--i': String(i - mid) } }, [glyph]);
  });
  const gtext = el('div', { class: 'gtext', 'aria-label': word }, cells);

  // viscosity slider → #goo-text stdDeviation
  const blurNode = document.querySelector('#goo-text feGaussianBlur');
  const range = el('input', {
    class: 'visc-range', type: 'range', min: '2', max: '18', step: '0.5', value: '8',
    'aria-label': 'Goo viscosity',
  });
  const setVisc = () => { if (blurNode) blurNode.setAttribute('stdDeviation', range.value); };
  range.addEventListener('input', setVisc);
  setVisc();

  const control = el('label', { class: 'visc' }, [
    el('span', { class: 'visc-label' }, 'thin'),
    range,
    el('span', { class: 'visc-label' }, 'thick'),
  ]);

  stage.appendChild(el('div', { class: 'gtext-wrap' }, [gtext, control]));

  return { setViscosity(v) { range.value = String(v); setVisc(); } };
}
