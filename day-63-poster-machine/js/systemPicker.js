// System section: one live-rendered mini per system. Minis re-render only
// when the poster identity (seed, palette, text) changes, one per macrotask
// so typing and slider drags stay smooth.
import { el } from "./dom.js";
import { SYSTEMS } from "./systems/index.js";
import { setSystem } from "./state.js";
import { createMiniRenderer } from "./minis.js";

export function mountSystemPicker({ container, nameEl, onChange, announce }) {
  const entries = SYSTEMS.map((system) => {
    const canvas = el("canvas", { attrs: { "aria-hidden": "true" } });
    const button = el("button", {
      className: "mini",
      type: "button",
      attrs: { "aria-pressed": "false", title: system.name },
      on: {
        click: () => {
          onChange((state) => setSystem(state, system.id));
          announce(`System: ${system.name}`);
        },
      },
    }, [canvas, el("span", { className: "mini-name", text: system.name })]);
    container.append(button);
    return { system, button, mini: createMiniRenderer(canvas, system.id) };
  });

  let lastKey = "";
  let stepTimer = 0;
  let debounceTimer = 0;

  function renderAll(state) {
    clearTimeout(stepTimer);
    let i = 0;
    const step = () => {
      if (i >= entries.length) return;
      entries[i].mini.render(state);
      i += 1;
      stepTimer = setTimeout(step, 0);
    };
    step();
  }

  function sync(state) {
    for (const entry of entries) {
      entry.button.setAttribute("aria-pressed", String(entry.system.id === state.system));
    }
    if (nameEl) nameEl.textContent = SYSTEMS.find((s) => s.id === state.system)?.name ?? "";
    const key = JSON.stringify([state.layoutSeed, state.palette, state.text]);
    if (key === lastKey) return;
    lastKey = key;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderAll(state), 60);
  }

  return {
    sync,
    /** Renders every mini immediately (boot, font swap). */
    renderNow(state) {
      lastKey = JSON.stringify([state.layoutSeed, state.palette, state.text]);
      clearTimeout(debounceTimer);
      clearTimeout(stepTimer);
      for (const entry of entries) entry.mini.render(state);
    },
  };
}
