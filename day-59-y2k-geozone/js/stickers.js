import { clampPosition, createDraggable } from "./drag.js";

const STORE_KEY = "stickers";
const DOUBLE_TAP_MS = 300;

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function initStickers({ layer, store }) {
  const stickers = [...layer.querySelectorAll("[data-sticker-id]")];
  // id -> { xPct, yPct }; only stickers the visitor has moved live here,
  // untouched ones keep their responsive CSS percent positions.
  const positions = store.getJSON(STORE_KEY, {});
  const save = debounce(() => store.setJSON(STORE_KEY, positions), 200);

  function applyStored(el, id) {
    const pos = positions[id];
    if (!pos) return;
    const w = layer.clientWidth;
    const h = layer.clientHeight;
    const clamped = clampPosition(
      (pos.xPct / 100) * w,
      (pos.yPct / 100) * h,
      el.offsetWidth,
      el.offsetHeight,
      w,
      h,
    );
    el.style.left = `${clamped.x}px`;
    el.style.top = `${clamped.y}px`;
  }

  function rememberPosition(el, id) {
    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    positions[id] = {
      xPct: ((rect.left - layerRect.left) / layerRect.width) * 100,
      yPct: ((rect.top - layerRect.top) / layerRect.height) * 100,
    };
    save();
  }

  function spin(el) {
    if (el.classList.contains("is-spinning")) return;
    el.classList.add("is-spinning");
  }

  for (const el of stickers) {
    const id = el.dataset.stickerId;
    applyStored(el, id);

    createDraggable(el, {
      getBounds: () => {
        const rect = layer.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      },
      // The sticker is itself a button — only ignore other controls.
      ignoreSelector: "a, input, textarea, select",
      onEnd: ({ moved }) => {
        if (moved) rememberPosition(el, id);
      },
    });

    el.addEventListener("dblclick", () => spin(el));

    // Keyboard activation (click with detail 0) also spins.
    el.addEventListener("click", (event) => {
      if (event.detail === 0) spin(el);
    });

    // dblclick is unreliable on touch — detect a manual double tap.
    let lastTap = 0;
    el.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch") return;
      const now = performance.now();
      if (now - lastTap < DOUBLE_TAP_MS) spin(el);
      lastTap = now;
    });

    el.addEventListener("animationend", (event) => {
      if (event.animationName === "sticker-spin") el.classList.remove("is-spinning");
    });
  }

  window.addEventListener(
    "resize",
    debounce(() => {
      for (const el of stickers) applyStored(el, el.dataset.stickerId);
    }, 150),
  );

  return {
    reset() {
      for (const key of Object.keys(positions)) delete positions[key];
      save();
    },
  };
}
