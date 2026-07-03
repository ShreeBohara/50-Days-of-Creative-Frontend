/* 01 · HERO — "KINETIC" where each letter's weight, width and lift
   follow cursor proximity.

   Technique notes:
   - We animate font-weight / font-stretch numerically (they map onto the
     wght / wdth axes) instead of rewriting the font-variation-settings
     string every frame.
   - Every letter sits in a fixed-width slot measured at the MAX axis
     state, so weight/width changes never reflow the line (no jitter).
   - One gsap.ticker loop, paused whenever the section is offscreen. */

import { pointer, lerp, smoothstep, clamp01 } from "./pointer.js";

const MIN = { wght: 250, wdth: 78 }; // resting state (far from cursor)
const MAX = { wght: 900, wdth: 125 }; // fully swollen (cursor on top)
const SMOOTH = 0.14; // per-frame interpolation factor
const LIFT = 0.06; // lift near cursor, as a fraction of font size
const IDLE_MS = 3000; // desktop: hand control to the orbit after this

export function initHero(section) {
  const word = section.querySelector(".hero-word");
  const text = word.getAttribute("aria-label") || word.textContent.trim();

  // Hand-split into letter spans (the h1 keeps its aria-label)
  word.textContent = "";
  const letters = [...text].map((ch) => {
    const s = document.createElement("span");
    s.className = "ltr";
    s.textContent = ch;
    s.setAttribute("aria-hidden", "true");
    word.appendChild(s);
    return s;
  });

  const state = letters.map(() => ({
    wght: MIN.wght,
    wdth: MIN.wdth,
    y: 0,
    cx: 0,
    cyPage: 0,
  }));
  const setters = letters.map((el) => ({
    wght: gsap.quickSetter(el, "fontWeight"),
    wdth: gsap.quickSetter(el, "fontStretch", "%"),
    y: gsap.quickSetter(el, "y", "px"),
  }));

  let fontPx = 100;

  /* Measure each letter at the MAX state and freeze that as its slot
     width; then rest the letters at MIN. Line metrics never change
     again, so the word cannot jitter. */
  function measure() {
    letters.forEach((el) => {
      el.style.width = "auto";
      el.style.fontWeight = MAX.wght;
      el.style.fontStretch = MAX.wdth + "%";
    });
    const widths = letters.map((el) => el.getBoundingClientRect().width);
    letters.forEach((el, i) => {
      el.style.width = widths[i] + "px";
      el.style.fontWeight = MIN.wght;
      el.style.fontStretch = MIN.wdth + "%";
    });
    fontPx = parseFloat(getComputedStyle(word).fontSize);
    letters.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      state[i].cx = r.left + r.width / 2;
      state[i].cyPage = r.top + r.height / 2 + window.scrollY;
    });
  }

  measure();
  document.fonts.ready.then(measure);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });

  /* Virtual pointer: touch devices never hover, and an untouched
     desktop hero should still move — a slow Lissajous orbit over the
     word takes over when the real pointer goes quiet. */
  function orbitPoint(now) {
    const t = now / 1000;
    const wr = word.getBoundingClientRect();
    return {
      x: wr.left + wr.width / 2 + Math.sin(t * 0.9) * wr.width * 0.45,
      y: wr.top + wr.height / 2 + Math.sin(t * 1.4 + 1.3) * wr.height * 1.1,
    };
  }

  function tick() {
    const now = performance.now();
    const idle =
      !pointer.fine || !pointer.moved || now - pointer.lastMove > IDLE_MS;
    const p = idle ? orbitPoint(now) : pointer;
    const radius = Math.max(240, window.innerWidth * 0.35);

    for (let i = 0; i < letters.length; i++) {
      const st = state[i];
      const d = Math.hypot(st.cx - p.x, st.cyPage - window.scrollY - p.y);
      const t = smoothstep(clamp01(1 - d / radius));

      st.wght += (lerp(MIN.wght, MAX.wght, t) - st.wght) * SMOOTH;
      st.wdth += (lerp(MIN.wdth, MAX.wdth, t) - st.wdth) * SMOOTH;
      st.y += (-t * fontPx * LIFT - st.y) * SMOOTH;

      setters[i].wght(st.wght);
      setters[i].wdth(st.wdth);
      setters[i].y(st.y);
    }
  }

  /* Run the loop only while the hero is on screen */
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) =>
      self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick),
  });
}
