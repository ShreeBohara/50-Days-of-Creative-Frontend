/* Day 12 — 3D Card Deck */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const deck = document.querySelector('[data-deck]');
  const cards = [...document.querySelectorAll('[data-card]')];
  const total = cards.length;

  /* Card order: index 0 = top card */
  let cardOrder = cards.map((_, i) => i);
  let state = 'stack'; // 'stack' | 'fan' | 'shuffle'

  /* ---- Stack positioning ---- */

  function positionStack() {
    state = 'stack';
    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      card.style.transition = 'transform 0.8s var(--ease-out-expo)';
      card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
      card.style.zIndex = total - pos;
      card.style.filter = `brightness(${1 - pos * 0.03})`;
    });
  }

  positionStack();
});
