import { normalizeMessageText } from "./messageMode.js";

export function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(
    "a, button, input, textarea, select, summary, [contenteditable]:not([contenteditable='false'])",
  ));
}

export function createTabController(options) {
  const tabs = [...options.tabs];
  const panels = [...options.panels];
  let selectedMode = options.initialMode;

  function sync() {
    tabs.forEach((tab) => {
      const selected = tab.dataset.mode === selectedMode;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const selected = panel.id === `panel-${selectedMode}`;
      panel.classList.toggle("is-active", selected);
      panel.hidden = !selected;
    });
  }

  function select(mode, { focus = false, force = false } = {}) {
    const tab = tabs.find((candidate) => candidate.dataset.mode === mode);
    if (!tab) return false;
    const changed = selectedMode !== mode;
    selectedMode = mode;
    sync();
    if (focus) tab.focus();
    if (changed || force) options.onSelect?.(mode);
    return changed;
  }

  function onClick(event) {
    select(event.currentTarget.dataset.mode);
  }

  function onKeydown(event) {
    const currentIndex = tabs.indexOf(event.currentTarget);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[nextIndex].dataset.mode, { focus: true });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", onClick);
    tab.addEventListener("keydown", onKeydown);
  });
  sync();

  return {
    select,
    get selectedMode() {
      return selectedMode;
    },
    destroy() {
      tabs.forEach((tab) => {
        tab.removeEventListener("click", onClick);
        tab.removeEventListener("keydown", onKeydown);
      });
    },
  };
}

export function createFocusTyping(options) {
  const { button, boardTarget } = options;
  let active = false;
  let buffer = "";

  function sync() {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector("strong").textContent = active ? "Typing active" : "Focus typing";
    button.querySelector("small").textContent = active ? "Type now · Esc exits" : "Write directly to row one";
    options.onStateChange?.(active);
  }

  function write() {
    buffer = Array.from(buffer).slice(0, options.getColumns()).join("");
    options.setText(buffer);
  }

  function enter() {
    if (active) return;
    options.onEnter?.();
    buffer = "";
    active = true;
    write();
    sync();
    boardTarget.focus({ preventScroll: true });
    options.announce?.("Focus typing active. Type to fill row one. Press Escape to exit.");
  }

  function exit({ restoreFocus = true, announce = true } = {}) {
    if (!active) return;
    active = false;
    sync();
    if (restoreFocus) button.focus({ preventScroll: true });
    if (announce) options.announce?.("Focus typing ended");
  }

  function toggle() {
    if (active) exit();
    else enter();
  }

  function onKeydown(event) {
    const altShortcut = event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "k";
    if (altShortcut && !isInteractiveTarget(event.target)) {
      event.preventDefault();
      toggle();
      return;
    }

    if (!active || event.isComposing || event.repeat || isInteractiveTarget(event.target)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      exit();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      buffer = Array.from(buffer).slice(0, -1).join("");
      write();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    const character = normalizeMessageText(event.key).charAt(0) || " ";
    if (Array.from(buffer).length < options.getColumns()) {
      buffer += character;
      write();
    }
  }

  function onFocusIn(event) {
    if (active && event.target !== button && isInteractiveTarget(event.target)) {
      exit({ restoreFocus: false, announce: false });
    }
  }

  function onButtonClick() {
    toggle();
  }

  button.addEventListener("click", onButtonClick);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("focusin", onFocusIn);
  sync();

  return {
    enter,
    exit,
    toggle,
    resize() {
      if (active) write();
    },
    destroy() {
      active = false;
      button.removeEventListener("click", onButtonClick);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("focusin", onFocusIn);
    },
    get active() {
      return active;
    },
    get text() {
      return buffer;
    },
  };
}
