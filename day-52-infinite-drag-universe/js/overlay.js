/* VOID POST — expand overlay.
   Clicking a card FLIPs it from its grid rect to a centered detail view:
   measure origin, lay out the big card, apply the inverted transform, then
   release it to the identity. Close reverses back to wherever the origin
   tile currently sits (the field may have drifted meanwhile). */

import { buildPostcardSVG, CARDS, cardCoords, CARD_W, CARD_H } from "./postcards.js";

const OPEN_MS = 460;
const CLOSE_MS = 340;

export function createOverlay({ engine }) {
  let open = false;
  let originTile = null;
  let lastFocus = null;

  /* --- static DOM, built once --- */
  const root = document.createElement("div");
  root.className = "overlay";

  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";
  root.appendChild(backdrop);

  const card = document.createElement("figure");
  card.className = "overlay-card";
  root.appendChild(card);

  const meta = document.createElement("figcaption");
  meta.className = "overlay-meta";
  const metaName = document.createElement("h2");
  metaName.className = "overlay-name";
  const metaLine = document.createElement("p");
  metaLine.className = "overlay-note";
  const metaSub = document.createElement("p");
  metaSub.className = "overlay-sub";
  meta.appendChild(metaName);
  meta.appendChild(metaLine);
  meta.appendChild(metaSub);
  root.appendChild(meta);

  const closeBtn = document.createElement("button");
  closeBtn.className = "overlay-close";
  closeBtn.setAttribute("aria-label", "Close postcard");
  closeBtn.textContent = "×";
  root.appendChild(closeBtn);

  document.body.appendChild(root);

  /* --- geometry helpers --- */

  function targetRect() {
    // biggest centered card that fits, keeping the postcard aspect
    const margin = Math.min(innerWidth, innerHeight) * 0.08;
    const maxW = Math.min(innerWidth - margin * 2, 460);
    const maxH = innerHeight - margin * 2 - 110; // leave room for the caption
    const w = Math.min(maxW, maxH * (CARD_W / CARD_H));
    const h = w * (CARD_H / CARD_W);
    return { w, h, x: (innerWidth - w) / 2, y: (innerHeight - h) / 2 - 34 };
  }

  function flipFrom(fromRect, to) {
    const dx = fromRect.left - to.x;
    const dy = fromRect.top - to.y;
    const sx = fromRect.width / to.w;
    const sy = fromRect.height / to.h;
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  }

  /* --- open / close --- */

  function show(tile) {
    if (open) return;
    open = true;
    originTile = tile;
    lastFocus = document.activeElement;
    engine.state.vx = 0;
    engine.state.vy = 0;

    const index = Number(tile.dataset.card);
    while (card.firstChild) card.removeChild(card.firstChild);
    card.appendChild(buildPostcardSVG(index));

    metaName.textContent = CARDS[index].name;
    metaLine.textContent = "“" + CARDS[index].note + "”";
    metaSub.textContent = `SECTOR ${String(index + 1).padStart(2, "0")} · ${cardCoords(index)} · VOID POST`;

    const to = targetRect();
    card.style.width = `${to.w}px`;
    card.style.height = `${to.h}px`;
    card.style.left = `${to.x}px`;
    card.style.top = `${to.y}px`;
    meta.style.top = `${to.y + to.h + 26}px`;
    closeBtn.style.left = `${to.x + to.w - 18}px`;
    closeBtn.style.top = `${to.y - 18}px`;

    root.classList.add("is-open");
    card.style.transition = "none";
    card.style.transform = flipFrom(tile.getBoundingClientRect(), to);
    void card.offsetWidth; // commit the inverted state before releasing it
    card.style.transition = `transform ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    card.style.transform = "none";

    setTimeout(() => root.classList.add("is-settled"), OPEN_MS * 0.55);
    closeBtn.focus();
  }

  function hide() {
    if (!open) return;
    open = false;
    root.classList.remove("is-settled");

    const to = targetRect();
    const from = originTile ? originTile.getBoundingClientRect() : null;
    const onScreen = from && from.right > 0 && from.left < innerWidth &&
                     from.bottom > 0 && from.top < innerHeight;

    card.style.transition = `transform ${CLOSE_MS}ms cubic-bezier(0.55, 0, 0.55, 0.2)`;
    card.style.transform = onScreen
      ? flipFrom(from, to)
      : "translate(0px, 40px) scale(0.9)"; // origin drifted away: settle down and fade

    setTimeout(() => {
      root.classList.remove("is-open");
      card.style.transition = "none";
      card.style.transform = "none";
    }, CLOSE_MS);

    if (lastFocus && lastFocus.focus) lastFocus.focus();
    originTile = null;
  }

  backdrop.addEventListener("pointerdown", (e) => e.stopPropagation());
  backdrop.addEventListener("click", hide);
  closeBtn.addEventListener("click", hide);
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  return { show, hide, isOpen: () => open };
}
