import { setPointCount } from "./scene.js";
import { setNumericSetting } from "./settings.js";

function rangeField({ id, label, min, max, step, value, format, onInput }) {
  const field = document.createElement("div");
  field.className = "range-field";
  const heading = document.createElement("div");
  heading.className = "range-heading";
  const labelElement = document.createElement("label");
  labelElement.htmlFor = id;
  labelElement.textContent = label;
  const output = document.createElement("output");
  output.htmlFor = id;
  output.value = format(value);
  output.textContent = format(value);
  const input = document.createElement("input");
  input.id = id;
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;

  function syncTrack() {
    const progress = ((Number(input.value) - Number(min)) / (Number(max) - Number(min))) * 100;
    input.style.setProperty("--range-progress", `${progress}%`);
  }

  input.addEventListener("input", () => {
    output.value = format(input.value);
    output.textContent = format(input.value);
    syncTrack();
    onInput(input.value);
  });
  syncTrack();
  heading.append(labelElement, output);
  field.append(heading, input);
  return field;
}

function icon(name) {
  if (name === "pause") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';
}

export function mountStudioControls({
  motionContainer,
  surfaceContainer,
  scene,
  onChange,
  onPointCountChange,
  announce,
}) {
  const count = rangeField({
    id: "point-count",
    label: "Color points",
    min: 3,
    max: 6,
    step: 1,
    value: scene.pointCount,
    format: (value) => String(Math.round(value)),
    onInput: (value) => {
      setPointCount(scene, value);
      onPointCountChange();
      onChange();
    },
  });
  const speed = rangeField({
    id: "drift-speed",
    label: "Drift speed",
    min: 0,
    max: 2,
    step: 0.05,
    value: scene.settings.speed,
    format: (value) => `${Number(value).toFixed(2)}×`,
    onInput: (value) => {
      setNumericSetting(scene, "speed", value);
      onChange();
    },
  });
  const size = rangeField({
    id: "blob-size",
    label: "Blob size",
    min: 70,
    max: 150,
    step: 1,
    value: scene.settings.size * 100,
    format: (value) => `${Math.round(value)}%`,
    onInput: (value) => {
      setNumericSetting(scene, "size", Number(value) / 100);
      onChange();
    },
  });
  motionContainer.replaceChildren(count, speed, size);

  const grain = rangeField({
    id: "grain-amount",
    label: "Film grain",
    min: 0,
    max: 20,
    step: 1,
    value: scene.settings.grain * 100,
    format: (value) => `${Math.round(value)}%`,
    onInput: (value) => {
      setNumericSetting(scene, "grain", Number(value) / 100);
      onChange();
    },
  });

  const toggles = document.createElement("div");
  toggles.className = "setting-actions";
  const vignetteLabel = document.createElement("label");
  vignetteLabel.className = "switch-row";
  vignetteLabel.innerHTML = '<span>Edge vignette</span><span class="switch"><input type="checkbox" id="vignette-toggle"><i aria-hidden="true"></i></span>';
  const vignette = vignetteLabel.querySelector("input");
  vignette.checked = scene.settings.vignette;
  vignette.addEventListener("change", () => {
    scene.settings.vignette = vignette.checked;
    onChange();
    announce(`Vignette ${vignette.checked ? "enabled" : "disabled"}`);
  });

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "play-button";

  function syncPlayButton() {
    const isPlaying = scene.settings.playing;
    playButton.innerHTML = `${icon(isPlaying ? "pause" : "play")}<span>${isPlaying ? "Pause motion" : "Play motion"}</span>`;
    playButton.setAttribute("aria-pressed", String(isPlaying));
  }

  playButton.addEventListener("click", () => {
    scene.settings.playing = !scene.settings.playing;
    syncPlayButton();
    onChange();
    announce(`Motion ${scene.settings.playing ? "playing" : "paused"}`);
  });
  syncPlayButton();
  toggles.append(vignetteLabel, playButton);
  surfaceContainer.replaceChildren(grain, toggles);

  return { syncPlayButton };
}
