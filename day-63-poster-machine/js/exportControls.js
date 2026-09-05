// Export section: one button that re-renders the current seed at print
// resolution. The label swaps before the synchronous render so the UI
// visibly acknowledges the click.
import { el } from "./dom.js";
import { downloadPng, EXPORT_WIDTH, EXPORT_HEIGHT } from "./exportPng.js";

export function mountExportControls({ container, getState, getCode, announce }) {
  const label = `Export PNG · ${EXPORT_WIDTH}×${EXPORT_HEIGHT}`;
  const button = el("button", { className: "btn btn-primary btn-export", type: "button", text: label });
  const status = el("p", {
    className: "export-status", id: "export-status",
    text: "Re-renders this exact seed at print resolution (3:4, 300 dpi at 8×10.7 in).",
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = `Rendering ${EXPORT_WIDTH}×${EXPORT_HEIGHT}…`;
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const result = await downloadPng(getState(), { code: getCode() });
      status.textContent = `Saved ${result.fileName} (${result.width}×${result.height})`
        + (result.fallback ? " — reduced size for this device" : "");
    } catch (error) {
      status.textContent = `Export failed: ${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = label;
      announce(status.textContent);
    }
  });

  container.append(button, status);
  return { sync() {} };
}
