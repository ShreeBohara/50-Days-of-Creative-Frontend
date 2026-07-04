// Control panel. Everything is built with createElement — no markup strings —
// and every control writes straight into the shared state, then asks the
// main module to re-render. Randomize re-rolls the style controls and
// re-syncs every widget from state.

import { PALETTES, resolvePalette, applyAccent, rgbToHex } from "./palettes.js";
import { DITHERERS } from "./ditherers.js";

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

function buildSlider(labelText, min, max, value, onInput) {
  const wrap = el("div", "field field-slider");
  const head = el("div", "slider-head");
  const label = el("label", "field-label");
  label.textContent = labelText;
  const readout = el("span", "slider-value");
  head.appendChild(label);
  head.appendChild(readout);
  wrap.appendChild(head);

  const input = el("input", "slider", { type: "range", min, max, step: 1 });
  input.value = value;
  input.addEventListener("input", () => onInput(Number(input.value)));
  wrap.appendChild(input);

  const sync = (v) => {
    input.value = v;
    readout.textContent = String(v);
  };
  sync(value);
  return { wrap, sync };
}

function buildToggle(labelText, checked, onChange) {
  const label = el("label", "toggle");
  const input = el("input", "", { type: "checkbox" });
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  const box = el("span", "toggle-box", { "aria-hidden": "true" });
  const text = el("span", "toggle-text");
  text.textContent = labelText;
  label.appendChild(input);
  label.appendChild(box);
  label.appendChild(text);
  const sync = (v) => { input.checked = v; };
  return { wrap: label, sync, input };
}

// ---- palette section ----------------------------------------------------------

function buildPaletteSection(container, state, update) {
  const paletteField = field("palette");
  const options = Object.entries(PALETTES).map(([key, p]) => [key, p.label]);
  const { wrap, select } = buildSelect(options, state.palette, (value) => {
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

  const syncSelect = () => { select.value = state.palette; };

  container.appendChild(paletteField);
  return { refreshStrip, rebuildCustom, syncSelect };
}

// ---- panel assembly ---------------------------------------------------------------

/**
 * Build the control panel into `container`.
 * hooks: { onChange(), loadFile(file) }
 */
export function buildControls(container, state, hooks) {
  const syncFns = [];
  let palette;

  const update = () => {
    applyAccent(resolvePalette(state));
    palette.refreshStrip();
    hooks.onChange();
  };

  const syncAll = () => {
    for (const fn of syncFns) fn();
    palette.syncSelect();
    palette.rebuildCustom();
    palette.refreshStrip();
  };

  // -- source ---------------------------------------------------------------
  const srcField = field("source");
  const fileInput = el("input", "visually-hidden", {
    type: "file",
    accept: "image/*",
    "aria-label": "upload an image",
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) hooks.loadFile(fileInput.files[0]);
    fileInput.value = "";
  });
  const loadBtn = el("button", "btn btn-block", { type: "button" });
  loadBtn.textContent = "load image…";
  loadBtn.addEventListener("click", () => fileInput.click());
  const dropHint = el("p", "drop-hint");
  dropHint.textContent = "or drop a picture anywhere on the page";
  srcField.appendChild(fileInput);
  srcField.appendChild(loadBtn);
  srcField.appendChild(dropHint);
  container.appendChild(srcField);

  container.appendChild(el("hr", "ctrl-sep"));

  // -- algorithm ---------------------------------------------------------------
  const algoField = field("algorithm");
  const algoOptions = Object.entries(DITHERERS).map(([key, a]) => [key, a.label]);
  const algoSelect = buildSelect(algoOptions, state.algorithm, (value) => {
    state.algorithm = value;
    syncSerpentine();
    update();
  });
  algoField.appendChild(algoSelect.wrap);
  container.appendChild(algoField);
  syncFns.push(() => { algoSelect.select.value = state.algorithm; });

  // serpentine only means something for error diffusion
  const serpentine = buildToggle("serpentine scan", state.serpentine, (v) => {
    state.serpentine = v;
    update();
  });
  const syncSerpentine = () => {
    const diffusion = (DITHERERS[state.algorithm] || {}).diffusion;
    serpentine.wrap.classList.toggle("is-disabled", !diffusion);
    serpentine.input.disabled = !diffusion;
  };
  syncSerpentine();
  container.appendChild(serpentine.wrap);
  syncFns.push(() => { serpentine.sync(state.serpentine); syncSerpentine(); });

  container.appendChild(el("hr", "ctrl-sep"));

  // -- palette -------------------------------------------------------------------
  palette = buildPaletteSection(container, state, () => {
    palette.rebuildCustom();
    update();
  });

  container.appendChild(el("hr", "ctrl-sep"));

  // -- adjustments ------------------------------------------------------------------
  const px = buildSlider("pixel size", 1, 8, state.pixelSize, (v) => {
    state.pixelSize = v;
    px.sync(v);
    update();
  });
  container.appendChild(px.wrap);
  syncFns.push(() => px.sync(state.pixelSize));

  const bright = buildSlider("brightness", -100, 100, state.brightness, (v) => {
    state.brightness = v;
    bright.sync(v);
    update();
  });
  container.appendChild(bright.wrap);
  syncFns.push(() => bright.sync(state.brightness));

  const contrast = buildSlider("contrast", -100, 100, state.contrast, (v) => {
    state.contrast = v;
    contrast.sync(v);
    update();
  });
  container.appendChild(contrast.wrap);
  syncFns.push(() => contrast.sync(state.contrast));

  const gray = buildToggle("grayscale first", state.grayscale, (v) => {
    state.grayscale = v;
    update();
  });
  container.appendChild(gray.wrap);
  syncFns.push(() => gray.sync(state.grayscale));

  const crt = buildToggle("crt monitor pass", state.crt, (v) => {
    state.crt = v;
    update();
  });
  container.appendChild(crt.wrap);
  syncFns.push(() => crt.sync(state.crt));

  container.appendChild(el("hr", "ctrl-sep"));

  // -- randomize ------------------------------------------------------------------------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randomBtn = el("button", "btn btn-block btn-random", { type: "button" });
  randomBtn.textContent = "☒ randomize style";
  randomBtn.addEventListener("click", () => {
    state.algorithm = pick(Object.keys(DITHERERS).filter((k) => k !== "none"));
    state.palette = pick(Object.keys(PALETTES).filter((k) => k !== "custom"));
    state.pixelSize = 1 + Math.floor(Math.random() * 6);
    state.brightness = Math.floor(Math.random() * 41) - 20;
    state.contrast = Math.floor(Math.random() * 51) - 15;
    state.serpentine = Math.random() < 0.5;
    state.grayscale = Math.random() < 0.25;
    state.crt = Math.random() < 0.35;
    syncAll();
    update();
  });
  container.appendChild(randomBtn);

  // initial sync
  applyAccent(resolvePalette(state));
  palette.refreshStrip();
  palette.rebuildCustom();

  return { update, syncAll };
}
