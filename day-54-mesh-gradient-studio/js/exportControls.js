import { downloadPng } from "./exportPng.js";
import { copyCssBackground } from "./exportCss.js";

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>';
const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';

export function mountPngExport({ container, scene, getFramePoints, grainTexture, announce }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "export-button export-button--primary";
  button.innerHTML = `${DOWNLOAD_ICON}<span>Download PNG</span>`;

  button.addEventListener("click", async () => {
    const label = button.querySelector("span");
    button.disabled = true;
    label.textContent = "Rendering 1080p…";
    try {
      const result = await downloadPng({
        scene,
        framePoints: getFramePoints(),
        grainTexture,
      });
      announce(`PNG downloaded at ${result.width} by ${result.height} pixels`);
    } catch (error) {
      announce(error.message || "PNG export failed");
    } finally {
      button.disabled = false;
      label.textContent = "Download PNG";
    }
  });

  container.append(button);
  return button;
}

export function mountCssExport({
  container,
  scene,
  getFramePoints,
  fallbackDialog,
  fallbackCode,
  notify,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "export-button";
  button.innerHTML = `${COPY_ICON}<span>Copy CSS</span>`;

  button.addEventListener("click", async () => {
    const result = await copyCssBackground(scene, getFramePoints());
    if (result.copied) {
      notify("Static mesh CSS copied — motion, grain, and vignette are not included");
      return;
    }

    fallbackCode.value = result.css;
    if (typeof fallbackDialog.showModal === "function") fallbackDialog.showModal();
    else fallbackDialog.setAttribute("open", "");
    fallbackCode.focus();
    fallbackCode.select();
    notify("Clipboard unavailable — CSS is ready to copy manually");
  });

  container.append(button);
  return button;
}
