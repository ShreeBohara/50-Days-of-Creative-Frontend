/* Day 12 — 3D Card Deck */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const deck = document.querySelector('[data-deck]');
  const cards = [...document.querySelectorAll('[data-card]')];
  const total = cards.length;
  const indicator = document.querySelector('[data-indicator]');

  let cardOrder = cards.map((_, i) => i);
  let state = 'stack'; // 'stack' | 'fan' | 'shuffle'
  let isAnimating = false;
  let fanFocusIndex = 0; // which card is "focused" in fan mode

  /* ---- Indicator ---- */

  function updateIndicator() {
    if (!indicator) return;
    const topIdx = cardOrder[0];
    const card = cards[topIdx];
    const title = card.querySelector('.card__title')?.textContent || '';
    indicator.textContent = `${cardOrder.indexOf(topIdx) + 1} / ${total} — ${title}`;
  }

  /* ---- Stack positioning ---- */

  function positionStack() {
    state = 'stack';
    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      card.style.transition = 'transform 0.8s var(--ease-out-expo), filter 0.8s ease, opacity 0.5s ease';
      card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
      card.style.zIndex = total - pos;
      card.style.filter = `brightness(${1 - pos * 0.03})`;
      card.style.opacity = '1';
      card.classList.remove('card--fan-focus');
    });
    updateIndicator();
  }

  /* ---- Cycle cards ---- */

  function cycleCard(direction) {
    if (isAnimating || state !== 'stack') return;
    isAnimating = true;
    unflipAll();

    const topIdx = cardOrder[0];
    const topCard = cards[topIdx];
    topCard.classList.remove('card--top');

    topCard.style.transition = 'transform 0.7s var(--ease-out-expo), opacity 0.5s ease';
    topCard.style.transform = `rotateY(${direction * 120}deg) translateZ(200px) translateX(${direction * -450}px)`;
    topCard.style.opacity = '0';
    topCard.style.zIndex = 0;

    const remaining = cardOrder.slice(1);
    remaining.forEach((idx) => {
      const card = cards[idx];
      const newPos = remaining.indexOf(idx);
      card.style.transition = 'transform 0.6s var(--ease-out-expo), filter 0.6s ease';
      card.style.transform = `translate3d(${newPos * 2}px, ${newPos * 2}px, ${-newPos * 5}px)`;
      card.style.zIndex = total - newPos;
      card.style.filter = `brightness(${1 - newPos * 0.03})`;
    });

    let settled = false;
    const onDone = () => {
      if (settled) return;
      settled = true;

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
        updateFloat();
        updateIndicator();
      });
    };

    topCard.addEventListener('transitionend', onDone, { once: true });
    setTimeout(onDone, 800);
  }

  /* ---- Drag / swipe to cycle ---- */

  let dragStartX = 0;
  let dragStartTime = 0;
  let isDragging = false;

  function onPointerDown(e) {
    dragStartX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    dragStartTime = Date.now();
    isDragging = true;
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const dx = endX - dragStartX;
    const elapsed = Date.now() - dragStartTime;

    if (state === 'stack') {
      if (Math.abs(dx) > 40) {
        cycleCard(dx > 0 ? -1 : 1);
      } else if (Math.abs(dx) < 6 && elapsed < 300) {
        flipTopCard();
      }
    } else if (state === 'fan') {
      if (Math.abs(dx) > 40) {
        navigateFan(dx > 0 ? -1 : 1);
      } else if (Math.abs(dx) < 6 && elapsed < 300) {
        flipFanCard();
      }
    }
  }

  deck.addEventListener('mousedown', onPointerDown);
  deck.addEventListener('mouseup', onPointerUp);
  deck.addEventListener('touchstart', onPointerDown, { passive: true });
  deck.addEventListener('touchend', onPointerUp, { passive: true });

  /* ---- Card flip ---- */

  function flipTopCard() {
    if (isAnimating || state !== 'stack') return;
    const topIdx = cardOrder[0];
    toggleFlip(cards[topIdx]);
  }

  function flipFanCard() {
    if (isAnimating || state !== 'fan') return;
    const idx = cardOrder[fanFocusIndex];
    toggleFlip(cards[idx]);
  }

  function toggleFlip(card) {
    card.classList.toggle('card--flipped');
    card.dataset.flipped = card.classList.contains('card--flipped') ? 'true' : 'false';
  }

  function unflipAll() {
    cards.forEach((card) => {
      card.classList.remove('card--flipped');
      card.dataset.flipped = 'false';
    });
  }

  /* ---- Fan navigation ---- */

  function navigateFan(direction) {
    if (isAnimating || state !== 'fan') return;
    unflipAll();
    fanFocusIndex = Math.max(0, Math.min(total - 1, fanFocusIndex + direction));
    highlightFanCard();
  }

  function highlightFanCard() {
    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      const isFocused = pos === fanFocusIndex;
      card.classList.toggle('card--fan-focus', isFocused);
      card.style.zIndex = isFocused ? total + 1 : total - Math.abs(pos - fanFocusIndex);
    });
    updateFanIndicator();
  }

  function updateFanIndicator() {
    if (!indicator) return;
    const idx = cardOrder[fanFocusIndex];
    const card = cards[idx];
    const title = card.querySelector('.card__title')?.textContent || '';
    indicator.textContent = `${fanFocusIndex + 1} / ${total} — ${title}`;
  }

  /* ---- Fan & Stack buttons ---- */

  const fanBtn = document.querySelector('[data-btn-fan]');
  const stackBtn = document.querySelector('[data-btn-stack]');

  function setActiveBtn(btn) {
    document.querySelectorAll('.controls__btn').forEach((b) => b.classList.remove('controls__btn--active'));
    if (btn) btn.classList.add('controls__btn--active');
  }

  function fanCards() {
    if (isAnimating) return;
    if (state === 'fan') { stackCards(); return; }
    isAnimating = true;
    state = 'fan';
    fanFocusIndex = 0;
    unflipAll();
    setActiveBtn(fanBtn);

    const spread = window.innerWidth < 768 ? 0.55 : 1;

    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      const center = (total - 1) / 2;
      const offset = pos - center;
      const angle = offset * 7 * spread;
      const tx = offset * 58 * spread;
      const tz = (280 - Math.abs(offset) * 18) * spread;

      card.style.transition = `transform 0.65s ${pos * 0.035}s var(--ease-spring), filter 0.4s ease`;
      card.style.transform = `rotateY(${angle}deg) translateZ(${tz}px) translateX(${tx}px)`;
      card.style.zIndex = total - Math.abs(Math.round(offset));
      card.style.filter = 'brightness(1)';
      card.classList.remove('card--top');
    });

    setTimeout(() => {
      isAnimating = false;
      highlightFanCard();
    }, 650 + total * 35);
  }

  function stackCards() {
    if (isAnimating) return;
    isAnimating = true;
    unflipAll();
    setActiveBtn(null);

    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      card.style.transition = `transform 0.6s ${pos * 0.03}s var(--ease-out-expo), filter 0.6s ease`;
      card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
      card.style.zIndex = total - pos;
      card.style.filter = `brightness(${1 - pos * 0.03})`;
      card.classList.remove('card--fan-focus');
    });

    setTimeout(() => {
      state = 'stack';
      isAnimating = false;
      updateFloat();
      updateIndicator();
    }, 600 + total * 30);
  }

  fanBtn.addEventListener('click', fanCards);
  stackBtn.addEventListener('click', () => {
    if (state !== 'stack') stackCards();
  });

  /* ---- Shuffle ---- */

  const shuffleBtn = document.querySelector('[data-btn-shuffle]');

  function shuffleCards() {
    if (isAnimating) return;
    isAnimating = true;
    state = 'shuffle';
    unflipAll();
    setActiveBtn(shuffleBtn);

    const scatterRange = window.innerWidth < 768 ? 0.5 : 1;

    cards.forEach((card, i) => {
      const rx = (Math.random() - 0.5) * 700 * scatterRange;
      const ry = (Math.random() - 0.5) * 500 * scatterRange;
      const rz = (Math.random() - 0.5) * 300;
      const ra = (Math.random() - 0.5) * 60;
      card.style.transition = `transform 0.55s ${i * 0.025}s var(--ease-shuffle), filter 0.3s ease`;
      card.style.transform = `translate3d(${rx}px, ${ry}px, ${rz}px) rotate(${ra}deg)`;
      card.style.zIndex = Math.floor(Math.random() * total);
      card.style.filter = 'brightness(1)';
      card.classList.remove('card--top', 'card--fan-focus');
    });

    setTimeout(() => {
      for (let i = cardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
      }

      cards.forEach((card) => {
        const pos = cardOrder.indexOf(+card.dataset.index);
        card.style.transition = `transform 0.6s ${pos * 0.045}s var(--ease-spring), filter 0.6s ease`;
        card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
        card.style.zIndex = total - pos;
        card.style.filter = `brightness(${1 - pos * 0.03})`;
      });

      setTimeout(() => {
        state = 'stack';
        isAnimating = false;
        setActiveBtn(null);
        updateFloat();
        updateIndicator();
      }, 650 + total * 45);
    }, 600);
  }

  shuffleBtn.addEventListener('click', shuffleCards);

  /* ---- Keyboard support ---- */

  document.addEventListener('keydown', (e) => {
    if (isAnimating) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (state === 'stack') cycleCard(1);
        else if (state === 'fan') navigateFan(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (state === 'stack') cycleCard(-1);
        else if (state === 'fan') navigateFan(-1);
        break;
      case ' ':
        e.preventDefault();
        if (state === 'stack') flipTopCard();
        else if (state === 'fan') flipFanCard();
        break;
      case 'Enter':
        e.preventDefault();
        if (state === 'stack') flipTopCard();
        else if (state === 'fan') flipFanCard();
        break;
      case 'Escape':
        e.preventDefault();
        unflipAll();
        if (state !== 'stack') stackCards();
        break;
      case 'f':
        fanCards();
        break;
      case 's':
        if (state !== 'stack') stackCards();
        break;
    }
  });

  /* ---- Floating animation on top card ---- */

  function updateFloat() {
    cards.forEach((card) => {
      const isTop = cardOrder.indexOf(+card.dataset.index) === 0;
      card.classList.toggle('card--top', isTop && state === 'stack');
    });
  }

  /* ---- Click on individual fanned cards ---- */

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (state !== 'fan' || isAnimating) return;
      const pos = cardOrder.indexOf(+card.dataset.index);
      if (pos === fanFocusIndex) {
        toggleFlip(card);
      } else {
        unflipAll();
        fanFocusIndex = pos;
        highlightFanCard();
      }
      e.stopPropagation();
    });
  });

  /* ---- Init ---- */

  positionStack();
  updateFloat();
  updateIndicator();
});
