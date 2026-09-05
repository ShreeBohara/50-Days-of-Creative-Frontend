// Gallery strip: thumbnails of the last eight rerolls. Each thumbnail is
// rendered from the entry's snapshot through the normal render path (so it
// is never a mid-fade frame); clicking restores that snapshot.
import { el } from "./dom.js";
import { pushHistory, HISTORY_CAP } from "./history.js";
import { POSTER_W, renderPoster } from "./poster.js";

const THUMB_W = 108;
const THUMB_H = 144;

export function mountGallery({ container, emptyEl, onRestore, announce }) {
  let entries = [];
  let activeCode = "";

  function thumbnailOf(snapshot, code) {
    const canvas = el("canvas", { attrs: { "aria-hidden": "true" } });
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
    const ctx = canvas.getContext("2d", { alpha: false });
    renderPoster(ctx, snapshot, { scale: THUMB_W / POSTER_W, code, finish: false });
    return canvas;
  }

  function render() {
    container.replaceChildren();
    for (const entry of entries) {
      const button = el("button", {
        className: "gallery-item",
        type: "button",
        attrs: {
          "aria-current": String(entry.code === activeCode),
          "aria-label": `Restore ${entry.code}`,
          title: `Restore ${entry.code}`,
        },
        on: {
          click: () => {
            onRestore(entry.snapshot);
            announce(`Restored ${entry.code}`);
          },
        },
      }, [entry.thumb, el("span", { className: "gallery-code", text: entry.code })]);
      container.append(button);
    }
    if (emptyEl) emptyEl.hidden = entries.length > 0;
  }

  return {
    /** Records a reroll. */
    push({ code, snapshot }) {
      entries = pushHistory(entries, { code, snapshot, thumb: thumbnailOf(snapshot, code) }, HISTORY_CAP);
      activeCode = code;
      render();
    },
    sync(state, code) {
      if (code === activeCode) return;
      activeCode = code;
      for (const button of container.children) {
        button.setAttribute("aria-current", String(button.title === `Restore ${code}`));
      }
    },
    entries: () => entries.map(({ code, snapshot }) => ({ code, snapshot })),
  };
}
