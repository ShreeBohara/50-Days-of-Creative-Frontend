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
    unflipAll();

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
        updateFloat();
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
    } else if (Math.abs(dx) < 6 && elapsed < 300) {
      /* Short tap = flip the top card */
      flipTopCard();
    }
  }

  deck.addEventListener('mousedown', onPointerDown);
  deck.addEventListener('mouseup', onPointerUp);
  deck.addEventListener('touchstart', onPointerDown, { passive: true });
  deck.addEventListener('touchend', onPointerUp, { passive: true });

  /* ---- Card flip ---- */

  function flipTopCard() {
    if (isAnimating) return;
    const topIdx = cardOrder[0];
    const topCard = cards[topIdx];
    toggleFlip(topCard);
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

  /* ---- Fan & Stack buttons ---- */

  const fanBtn = document.querySelector('[data-btn-fan]');
  const stackBtn = document.querySelector('[data-btn-stack]');

  function setActiveBtn(btn) {
    document.querySelectorAll('.controls__btn').forEach((b) => b.classList.remove('controls__btn--active'));
    if (btn) btn.classList.add('controls__btn--active');
  }

  function fanCards() {
    if (isAnimating) return;
    if (state === 'fan') { positionStack(); setActiveBtn(null); return; }
    isAnimating = true;
    state = 'fan';
    setActiveBtn(fanBtn);

    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      const center = (total - 1) / 2;
      const offset = pos - center;
      const angle = offset * 7;
      const tx = offset * 58;
      const tz = 280 - Math.abs(offset) * 18;

      card.style.transition = `transform 0.65s ${pos * 0.035}s var(--ease-spring), filter 0.4s ease`;
      card.style.transform = `rotateY(${angle}deg) translateZ(${tz}px) translateX(${tx}px)`;
      card.style.zIndex = total - Math.abs(Math.round(offset));
      card.style.filter = 'brightness(1)';
    });

    setTimeout(() => { isAnimating = false; }, 650 + total * 35);
  }

  function stackCards() {
    if (isAnimating) return;
    isAnimating = true;
    setActiveBtn(null);

    cards.forEach((card) => {
      const pos = cardOrder.indexOf(+card.dataset.index);
      card.style.transition = `transform 0.6s ${pos * 0.03}s var(--ease-out-expo), filter 0.6s ease`;
      card.style.transform = `translate3d(${pos * 2}px, ${pos * 2}px, ${-pos * 5}px)`;
      card.style.zIndex = total - pos;
      card.style.filter = `brightness(${1 - pos * 0.03})`;
    });

    setTimeout(() => { state = 'stack'; isAnimating = false; updateFloat(); }, 600 + total * 30);
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
    setActiveBtn(shuffleBtn);

    /* Phase 1: scatter */
    cards.forEach((card, i) => {
      const rx = (Math.random() - 0.5) * 700;
      const ry = (Math.random() - 0.5) * 500;
      const rz = (Math.random() - 0.5) * 300;
      const ra = (Math.random() - 0.5) * 60;
      card.style.transition = `transform 0.55s ${i * 0.025}s var(--ease-shuffle), filter 0.3s ease`;
      card.style.transform = `translate3d(${rx}px, ${ry}px, ${rz}px) rotate(${ra}deg)`;
      card.style.zIndex = Math.floor(Math.random() * total);
      card.style.filter = 'brightness(1)';
    });

    /* Phase 2: Fisher-Yates shuffle */
    setTimeout(() => {
      for (let i = cardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
      }

      /* Phase 3: re-collect into stack */
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
      }, 650 + total * 45);
    }, 600);
  }

  shuffleBtn.addEventListener('click', shuffleCards);

  /* ---- Keyboard support ---- */

  document.addEventListener('keydown', (e) => {
    if (isAnimating) return;
    switch (e.key) {
      case 'ArrowRight': cycleCard(1); break;
      case 'ArrowLeft': cycleCard(-1); break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (state === 'stack') flipTopCard();
        break;
      case 'Escape':
        unflipAll();
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

  /* Patch positionStack to also set float */
  const _positionStack = positionStack;
  positionStack = function () {
    _positionStack();
    updateFloat();
  };

  positionStack();
});
