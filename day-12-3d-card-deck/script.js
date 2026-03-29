/* Day 12 — 3D Card Deck */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const deck = document.querySelector('[data-deck]');
  const cards = [...document.querySelectorAll('[data-card]')];
  const total = cards.length;

  let cardOrder = cards.map((_, i) => i);
  let state = 'stack';
  let isAnimating = false;

  /* ---- Stack positioning ---- */

  function positionStack() {
    state = 'stack';
    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      card.style.transition = 'transform 0.8s var(--ease-out-expo), filter 0.8s ease';
      card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
      card.style.zIndex = total - pos;
      card.style.filter = `brightness(${1 - pos * 0.03})`;
    });
  }

  /* ---- Cycle cards ---- */

  function cycleCard(direction) {
    if (isAnimating || state !== 'stack') return;
    isAnimating = true;

    const topIdx = cardOrder[0];
    const topCard = cards[topIdx];

    /* Fly the top card away */
    topCard.style.transition = 'transform 0.7s var(--ease-out-expo), opacity 0.5s ease';
    topCard.style.transform = `rotateY(${direction * 120}deg) translateZ(200px) translateX(${direction * -450}px)`;
    topCard.style.opacity = '0';
    topCard.style.zIndex = 0;

    /* Move remaining cards up in the stack */
    const remaining = cardOrder.slice(1);
    remaining.forEach((idx) => {
      const card = cards[idx];
      const newPos = remaining.indexOf(idx);
      card.style.transition = 'transform 0.6s var(--ease-out-expo), filter 0.6s ease';
      card.style.transform = `translate3d(${newPos * 2}px, ${newPos * 2}px, ${-newPos * 5}px)`;
      card.style.zIndex = total - newPos;
      card.style.filter = `brightness(${1 - newPos * 0.03})`;
    });

    /* After animation, snap departed card to bottom */
    const onDone = () => {
      topCard.style.transition = 'none';
      cardOrder = [...remaining, topIdx];
      const bottomPos = total - 1;
      topCard.style.transform = `translate3d(${bottomPos * 2}px, ${bottomPos * 2}px, ${-bottomPos * 5}px)`;
      topCard.style.zIndex = 1;
      topCard.style.filter = `brightness(${1 - bottomPos * 0.03})`;
      topCard.style.opacity = '1';

      requestAnimationFrame(() => {
        topCard.style.transition = 'transform 0.8s var(--ease-out-expo), filter 0.8s ease';
        isAnimating = false;
      });
    };

    topCard.addEventListener('transitionend', onDone, { once: true });
    setTimeout(onDone, 800); // fallback
  }

  /* ---- Drag / swipe to cycle ---- */

  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let isDragging = false;

  function onPointerDown(e) {
    if (state !== 'stack') return;
    dragStartX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    dragStartY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    dragStartTime = Date.now();
    isDragging = true;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const dx = endX - dragStartX;
    const elapsed = Date.now() - dragStartTime;

    if (Math.abs(dx) > 40) {
      cycleCard(dx > 0 ? -1 : 1);
    }
  }

  deck.addEventListener('mousedown', onPointerDown);
  deck.addEventListener('mouseup', onPointerUp);
  deck.addEventListener('touchstart', onPointerDown, { passive: true });
  deck.addEventListener('touchend', onPointerUp, { passive: true });

  positionStack();
});
