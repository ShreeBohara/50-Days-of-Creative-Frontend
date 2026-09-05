// Reroll button, Space-bar shortcut and the two lock toggles.
import { el, icon } from "./dom.js";
import { toggleLock, canReroll } from "./state.js";

const LOCK_PATH = "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z";

function isTypingTarget(target) {
  return target instanceof Element
    && Boolean(target.closest("input, textarea, select, button, [contenteditable]"));
}

export function mountRerollControls({ button, locksContainer, hintEl, onReroll, onChange, announce }) {
  const locks = ["palette", "layout"].map((which) => {
    const lockButton = el("button", {
      className: "lock",
      type: "button",
      attrs: { "aria-pressed": "false" },
      on: {
        click: () => {
          const next = lockButton.getAttribute("aria-pressed") !== "true";
          onChange((state) => toggleLock(state, which));
          announce(`${which} ${next ? "locked" : "unlocked"}`);
        },
      },
    }, [icon(LOCK_PATH, { size: 12 }), el("span", { text: `Lock ${which}` })]);
    locksContainer.append(lockButton);
    return { which, lockButton };
  });

  button.addEventListener("click", onReroll);
  window.addEventListener("keydown", (event) => {
    const isSpace = event.code === "Space" || event.key === " " || event.key === "Spacebar";
    if (!isSpace || event.repeat || isTypingTarget(event.target)) return;
    event.preventDefault();
    onReroll();
  });

  return {
    sync(state) {
      for (const lock of locks) {
        lock.lockButton.setAttribute("aria-pressed", String(Boolean(state.locks[lock.which])));
      }
      button.disabled = !canReroll(state);
      if (hintEl) {
        if (!canReroll(state)) hintEl.textContent = "both locked — nothing to reroll";
        else if (state.locks.palette) hintEl.textContent = "palette locked";
        else if (state.locks.layout) hintEl.textContent = "layout locked";
        else hintEl.textContent = "every code is a poster";
      }
    },
  };
}
