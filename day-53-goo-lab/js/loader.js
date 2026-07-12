// loader.js — SPECIMEN 03
// A replayable liquid loader. Three goo-filtered circles drip in as one, split
// apart, orbit, merge back, then a checkmark draws over the fading blob.
// The whole thing is driven by a single normalised progress p∈[0,1], so it can
// be played on rAF *or* seek()'d frame-by-frame (handy since preview rAF pauses).

import { el, svgEl, clamp, lerp, easeInOut, TAU } from './util.js';

const C = 100;             // centre of the 200×200 viewBox
const ORBIT = 48;          // orbit radius
const DUR = 3400;          // ms for one full play-through
const BASE = [-Math.PI / 2, -Math.PI / 2 + TAU / 3, -Math.PI / 2 + 2 * TAU / 3];

// position of the three circles + checkmark progress at progress p
function stateAt(p) {
  const c = [{}, {}, {}];
  let checkP = 0, blobAlpha = 1;

  if (p < 0.22) {                         // drip in from the top as one blob
    const t = easeInOut(p / 0.22);
    const y = lerp(-14, C, t);
    for (let i = 0; i < 3; i++) c[i] = { x: C, y, r: 22 };
  } else if (p < 0.42) {                  // split into three
    const t = (p - 0.22) / 0.20;
    const rad = lerp(0, ORBIT, easeInOut(t));
    const r = lerp(22, 15, t);
    for (let i = 0; i < 3; i++) c[i] = { x: C + Math.cos(BASE[i]) * rad, y: C + Math.sin(BASE[i]) * rad, r };
  } else if (p < 0.68) {                  // orbit
    const t = (p - 0.42) / 0.26;
    const rot = t * TAU;
    for (let i = 0; i < 3; i++) c[i] = { x: C + Math.cos(BASE[i] + rot) * ORBIT, y: C + Math.sin(BASE[i] + rot) * ORBIT, r: 15 };
  } else if (p < 0.84) {                  // merge back to centre
    const t = (p - 0.68) / 0.16;
    const rad = lerp(ORBIT, 0, easeInOut(t));
    const r = lerp(15, 24, t);
    for (let i = 0; i < 3; i++) c[i] = { x: C + Math.cos(BASE[i] + TAU) * rad, y: C + Math.sin(BASE[i] + TAU) * rad, r };
  } else {                                // resolve into a checkmark
    const t = (p - 0.84) / 0.16;
    const r = lerp(24, 12, easeInOut(t));
    for (let i = 0; i < 3; i++) c[i] = { x: C, y: C, r };
    checkP = easeInOut(clamp(t / 0.85, 0, 1));
    blobAlpha = 1 - clamp((t - 0.25) / 0.75, 0, 1);
  }
  return { c, checkP, blobAlpha };
}

export function mountLoader(stage) {
  const grad = svgEl('radialGradient', { id: 'loaderGrad', cx: '38%', cy: '32%' }, [
    svgEl('stop', { offset: '0%', 'stop-color': '#b6ffca' }),
    svgEl('stop', { offset: '100%', 'stop-color': '#33cf76' }),
  ]);
  const gooGroup = svgEl('g', { filter: 'url(#goo)' });
  const circles = [0, 1, 2].map(() => svgEl('circle', { cx: C, cy: C, r: 0, fill: 'url(#loaderGrad)' }));
  circles.forEach((c) => gooGroup.appendChild(c));
  const check = svgEl('path', { class: 'loader-check', d: 'M60 102 L88 130 L140 70' });
  const svg = svgEl('svg', { class: 'loader-svg', viewBox: '0 0 200 200', 'aria-hidden': 'true' },
    [svgEl('defs', {}, [grad]), gooGroup, check]);

  const replay = el('button', { class: 'loader-replay', type: 'button' }, [
    svgEl('svg', { viewBox: '0 0 24 24', class: 'loader-replay-ic', 'aria-hidden': 'true' }, [
      svgEl('path', {
        d: 'M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5',
        fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }),
    ]),
    'Replay',
  ]);
  const wrap = el('div', { class: 'loader-wrap' }, [svg, replay]);
  stage.appendChild(wrap);

  const checkLen = check.getTotalLength ? check.getTotalLength() : 170;
  check.style.strokeDasharray = String(checkLen);

  function render(p) {
    const s = stateAt(p);
    circles.forEach((c, i) => {
      c.setAttribute('cx', s.c[i].x.toFixed(2));
      c.setAttribute('cy', s.c[i].y.toFixed(2));
      c.setAttribute('r', s.c[i].r.toFixed(2));
    });
    gooGroup.style.opacity = s.blobAlpha;
    check.style.strokeDashoffset = String(checkLen * (1 - s.checkP));
    check.style.opacity = s.checkP > 0 ? 1 : 0;
    svg.classList.toggle('is-done', p >= 1);
  }

  let p = 0, playing = false, startT = 0;
  function frame(now) {
    if (!playing) return;
    if (!startT) startT = now;
    p = clamp((now - startT) / DUR, 0, 1);
    render(p);
    if (p < 1) requestAnimationFrame(frame);
    else playing = false;
  }
  function play() { p = 0; startT = 0; playing = true; render(0); requestAnimationFrame(frame); }

  replay.addEventListener('click', play);
  render(0);
  play(); // autoplay once on mount

  return {
    play,
    seek(v) { playing = false; p = clamp(v, 0, 1); render(p); },
  };
}
