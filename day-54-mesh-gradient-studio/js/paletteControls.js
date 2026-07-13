import { PALETTES, applyPalette } from "./palettes.js";

function createPresetButton(palette, scene, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "preset-button";
  button.dataset.preset = palette.id;
  button.setAttribute("aria-label", `Use ${palette.name} palette`);
  button.setAttribute("aria-pressed", String(scene.presetId === palette.id));

  const swatches = palette.colors
    .slice(0, 3)
    .map((color) => `<i style="--swatch:${color}"></i>`)
    .join("");
  button.innerHTML = `<span class="preset-swatches" aria-hidden="true">${swatches}</span><span>${palette.name}</span>`;
  button.addEventListener("click", () => onSelect(palette.id));
  return button;
}

export function mountPaletteControls({ container, scene, onChange, announce }) {
  const presetGrid = document.createElement("div");
  presetGrid.className = "preset-grid";
  const pointEditor = document.createElement("div");
  pointEditor.className = "point-editor";
  const pointHeading = document.createElement("p");
  pointHeading.className = "control-caption";
  pointHeading.textContent = "Active color points";
  const pointColors = document.createElement("div");
  pointColors.className = "point-colors";
  pointEditor.append(pointHeading, pointColors);

  function syncPresetState() {
    presetGrid.querySelectorAll(".preset-button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.preset === scene.presetId));
    });
  }

  function renderPointEditors() {
    pointColors.replaceChildren();
    scene.points.slice(0, scene.pointCount).forEach((point, index) => {
      const label = document.createElement("label");
      label.className = "point-color";
      label.innerHTML = `<span>P${index + 1}</span>`;
      const input = document.createElement("input");
      input.type = "color";
      input.value = point.color;
      input.setAttribute("aria-label", `Color point ${index + 1}`);
      input.addEventListener("input", () => {
        point.color = input.value.toUpperCase();
        scene.presetId = "custom";
        syncPresetState();
        onChange();
      });
      label.append(input);
      pointColors.append(label);
    });
  }

  function selectPreset(id) {
    const palette = applyPalette(scene, id);
    syncPresetState();
    renderPointEditors();
    onChange();
    announce(`${palette.name} palette selected`);
  }

  PALETTES.forEach((palette) => {
    presetGrid.append(createPresetButton(palette, scene, selectPreset));
  });
  container.replaceChildren(presetGrid, pointEditor);
  renderPointEditors();

  return {
    refresh() {
      syncPresetState();
      renderPointEditors();
    },
  };
}
