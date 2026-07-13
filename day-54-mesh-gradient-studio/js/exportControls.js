import { downloadPng } from "./exportPng.js";

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>';

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
