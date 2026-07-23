import { createDraggable } from "./drag.js";

// States: "open" | "minimized" | "closed". Minimize keeps the taskbar
// button live; close dims it until a desktop icon reopens the window.

export function initWindows({ windows, taskbarButtons, reducedMotion = () => false }) {
  let zTop = 500;
  const registry = new Map();

  function setActive(target) {
    for (const { win } of registry.values()) {
      win.classList.toggle("is-active", win === target);
    }
  }

  function raise(id) {
    const item = registry.get(id);
    if (!item) return;
    zTop += 1;
    item.win.style.zIndex = String(zTop);
    setActive(item.win);
  }

  function hideWhenSettled(win) {
    if (reducedMotion()) {
      win.hidden = true;
      return;
    }
    win.addEventListener(
      "transitionend",
      () => {
        if (win.classList.contains("is-minimized") || win.classList.contains("is-closed")) {
          win.hidden = true;
        }
      },
      { once: true },
    );
  }

  function rescueFocus(item, fallback) {
    // Hiding the element that holds focus dumps keyboard users on body;
    // hand focus to the control that brings the window back.
    if (item.win.contains(document.activeElement)) {
      fallback?.focus();
    }
  }

  function minimize(id) {
    const item = registry.get(id);
    if (!item || item.state !== "open") return;
    item.state = "minimized";
    item.win.classList.add("is-minimized");
    item.button.setAttribute("aria-pressed", "false");
    rescueFocus(item, item.button);
    hideWhenSettled(item.win);
  }

  function close(id) {
    const item = registry.get(id);
    if (!item || item.state === "closed") return;
    item.state = "closed";
    item.win.classList.remove("is-minimized");
    item.win.classList.add("is-closed");
    item.button.setAttribute("aria-pressed", "false");
    item.button.disabled = true;
    rescueFocus(item, document.querySelector(`[data-win-open="${id}"]`));
    hideWhenSettled(item.win);
  }

  function open(id) {
    const item = registry.get(id);
    if (!item) return;
    item.state = "open";
    item.button.disabled = false;
    item.button.setAttribute("aria-pressed", "true");
    item.win.hidden = false;
    // Force a frame so the un-minimize transition actually plays.
    void item.win.offsetWidth;
    item.win.classList.remove("is-minimized", "is-closed");
    raise(id);
    item.win.focus({ preventScroll: true });
  }

  function toggleFromTaskbar(id) {
    const item = registry.get(id);
    if (!item) return;
    if (item.state === "open") {
      minimize(id);
    } else {
      open(id);
    }
  }

  for (const win of windows) {
    const id = win.dataset.win;
    const titlebar = win.querySelector(".win-titlebar");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "taskbar-button";
    button.setAttribute("aria-pressed", "true");
    button.textContent = win.dataset.winTitle ?? id;
    button.addEventListener("click", () => toggleFromTaskbar(id));
    taskbarButtons.appendChild(button);

    registry.set(id, { win, button, state: "open" });

    createDraggable(win, { handle: titlebar });

    win.addEventListener("pointerdown", () => raise(id));
    win.querySelector("[data-win-minimize]")?.addEventListener("click", () => minimize(id));
    win.querySelector("[data-win-close]")?.addEventListener("click", () => close(id));
  }

  return {
    open,
    minimize,
    close,
    stateOf(id) {
      return registry.get(id)?.state;
    },
  };
}
