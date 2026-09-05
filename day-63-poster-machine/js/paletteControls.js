// Palette section: eight curated swatches plus a "seeded" swatch that draws
// a fresh 15-bit palette seed on every click.
import { el } from "./dom.js";
import { CURATED_PALETTES, resolvePalette } from "./palettes.js";
import { setPalette, PALETTE_BITS } from "./state.js";

function strip(palette) {
  const chips = [palette.bg, ...palette.colors.slice(0, 4)].map((color) =>
    el("span", { style: { background: color } }));
  return el("span", { className: "swatch-strip", attrs: { "aria-hidden": "true" } }, chips);
}

function paintStrip(node, palette) {
  const colors = [palette.bg, ...palette.colors.slice(0, 4)];
  Array.from(node.children).forEach((chip, i) => {
    chip.style.background = colors[i];
  });
}

export function mountPaletteControls({ container, nameEl, onChange, announce }) {
  const buttons = new Map();

  for (const palette of CURATED_PALETTES) {
    const button = el("button", {
      className: "swatch",
      type: "button",
      attrs: { "aria-pressed": "false", title: palette.name },
      on: {
        click: () => {
          onChange((state) => setPalette(state, { mode: "curated", id: palette.id }));
          announce(`Palette: ${palette.name}`);
        },
      },
    }, [strip(palette), el("span", { className: "swatch-name", text: palette.name })]);
    buttons.set(palette.id, button);
    container.append(button);
  }

  const seededStrip = strip(resolvePalette({ mode: "seeded", seed: 0 }));
  const seededButton = el("button", {
    className: "swatch swatch-seeded",
    type: "button",
    attrs: { "aria-pressed": "false", title: "Seeded palette — click again for another" },
    on: {
      click: () => {
        const seed = Math.floor(Math.random() * 2 ** PALETTE_BITS);
        onChange((state) => setPalette(state, { mode: "seeded", seed }));
        announce("Seeded palette. Click again or reroll for another.");
      },
    },
  }, [seededStrip, el("span", { className: "swatch-name", text: "Seeded ↻" })]);
  container.append(seededButton);

  function sync(state) {
    const seeded = state.palette.mode === "seeded";
    for (const [id, button] of buttons) {
      button.setAttribute("aria-pressed", String(!seeded && id === state.palette.id));
    }
    seededButton.setAttribute("aria-pressed", String(seeded));
    const palette = resolvePalette(state.palette);
    if (seeded) paintStrip(seededStrip, palette);
    if (nameEl) nameEl.textContent = palette.name;
  }

  return { sync };
}
