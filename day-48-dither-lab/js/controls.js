// Control panel. Everything is built with createElement — no markup strings —
// and every control writes straight into the shared state, then asks the
// main module to re-render.

import { PALETTES, resolvePalette, applyAccent, rgbToHex } from "./palettes.js";

// tiny DOM helper: el("div", "class-name", { attr: value })
function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function field(labelText) {
  const wrap = el("div", "field");
  const label = el("label", "field-label");
  label.textContent = labelText;
  wrap.appendChild(label);
  return wrap;
}

function buildSelect(options, value, onChange) {
  const wrap = el("div", "select-wrap");
  const select = el("select");
  for (const [key, label] of options) {
    const opt = el("option");
    opt.value = key;
    opt.textContent = label;
    if (key === value) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => onChange(select.value));
  wrap.appendChild(select);
  return { wrap, select };
}

// ---- palette section ----------------------------------------------------------

function buildPaletteSection(container, state, update) {
  const paletteField = field("palette");
  const options = Object.entries(PALETTES).map(([key, p]) => [key, p.label]);
  const { wrap } = buildSelect(options, state.palette, (value) => {
    state.palette = value;
    update();
  });
  paletteField.appendChild(wrap);

  // live swatch strip of the active palette
  const strip = el("div", "swatch-strip", { "aria-hidden": "true" });
  paletteField.appendChild(strip);

  // custom palette picker — 2 to 6 inks
  const customBox = el("div", "custom-box");
  paletteField.appendChild(customBox);

  const rebuildCustom = () => {
    while (customBox.firstChild) customBox.removeChild(customBox.firstChild);
    if (state.palette !== "custom") {
      customBox.classList.remove("is-open");
      return;
    }
    customBox.classList.add("is-open");

    const row = el("div", "custom-row");
    state.customColors.forEach((hex, i) => {
      const chip = el("span", "custom-chip");
      const input = el("input", "custom-color", { type: "color", value: hex });
      input.value = hex;
      input.setAttribute("aria-label", `custom color ${i + 1}`);
      input.addEventListener("input", () => {
        state.customColors[i] = input.value;
        update();
      });
      chip.appendChild(input);
      if (state.customColors.length > 2) {
        const del = el("button", "chip-del", { type: "button", "aria-label": `remove color ${i + 1}` });
        del.textContent = "×";
        del.addEventListener("click", () => {
          state.customColors.splice(i, 1);
          update();
          rebuildCustom();
        });
        chip.appendChild(del);
      }
      row.appendChild(chip);
    });

    if (state.customColors.length < 6) {
      const add = el("button", "btn btn-add", { type: "button" });
      add.textContent = "+ ink";
      add.addEventListener("click", () => {
        state.customColors.push("#888888");
        update();
        rebuildCustom();
      });
      row.appendChild(add);
    }
    customBox.appendChild(row);
  };

  const refreshStrip = () => {
    while (strip.firstChild) strip.removeChild(strip.firstChild);
    for (const c of resolvePalette(state)) {
      const sw = el("span", "swatch");
      sw.style.background = rgbToHex(c);
      strip.appendChild(sw);
    }
  };

  container.appendChild(paletteField);
  return { refreshStrip, rebuildCustom };
}

// ---- panel assembly ---------------------------------------------------------------

/**
 * Build the control panel into `container`.
 * `onChange()` is called after any state mutation; returns { refresh } used
 * to re-sync palette-dependent widgets.
 */
export function buildControls(container, state, onChange) {
  let palette;

  const update = () => {
    applyAccent(resolvePalette(state));
    palette.refreshStrip();
    onChange();
  };

  palette = buildPaletteSection(container, state, () => {
    palette.rebuildCustom();
    update();
  });

  // initial sync
  applyAccent(resolvePalette(state));
  palette.refreshStrip();
  palette.rebuildCustom();

  return { update };
}
