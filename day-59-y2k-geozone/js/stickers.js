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
    // offsetLeft/Top are the untransformed layout box — reading the
    // bounding rect here would bake the hover/drag scale and tilt into
    // the saved position and drift the sticker on every reload.
    positions[id] = {
      xPct: (el.offsetLeft / layer.clientWidth) * 100,
      yPct: (el.offsetTop / layer.clientHeight) * 100,
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

    let lastEndWasDrag = false;

    createDraggable(el, {
      getBounds: () => {
        const rect = layer.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      },
      // The sticker is itself a button — only ignore other controls.
      ignoreSelector: "a, input, textarea, select",
      onEnd: ({ moved }) => {
        lastEndWasDrag = moved;
        if (moved) rememberPosition(el, id);
      },
    });

    el.addEventListener("dblclick", () => spin(el));

    // Keyboard activation (click with detail 0) also spins.
    el.addEventListener("click", (event) => {
      if (event.detail === 0) spin(el);
    });

    // Arrow keys move a focused sticker (the drag affordance's keyboard path).
    el.addEventListener("keydown", (event) => {
      const deltas = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const direction = deltas[event.key];
      if (!direction) return;
      event.preventDefault();
      const step = event.shiftKey ? 2 : 14;
      const next = clampPosition(
        el.offsetLeft + direction[0] * step,
        el.offsetTop + direction[1] * step,
        el.offsetWidth,
        el.offsetHeight,
        layer.clientWidth,
        layer.clientHeight,
      );
      el.style.left = `${next.x}px`;
      el.style.top = `${next.y}px`;
      rememberPosition(el, id);
    });

    // dblclick is unreliable on touch — detect a manual double tap.
    // Drag releases land here too (setPointerCapture retargets the
    // pointerup), so a real drag must not count as a tap.
    let lastTap = 0;
    el.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch") return;
      if (lastEndWasDrag) {
        lastTap = 0;
        return;
      }
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
