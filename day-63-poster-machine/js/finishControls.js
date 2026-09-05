// Finish section: grain amount slider and paper-texture toggle.
import { el } from "./dom.js";
import { setFinish } from "./state.js";

export function mountFinishControls({ container, onChange }) {
  const grainValue = el("span", { className: "field-value", text: "35%" });
  const grain = el("input", {
    className: "range", type: "range", min: "0", max: "100", step: "1", id: "grain-range", value: "35",
    on: {
      input: () => {
        grainValue.textContent = `${grain.value}%`;
        onChange((state) => setFinish(state, { grain: Number(grain.value) / 100 }));
      },
    },
  });
  const paper = el("input", {
    className: "toggle", type: "checkbox", id: "paper-toggle", checked: true,
    on: { change: () => onChange((state) => setFinish(state, { paper: paper.checked })) },
  });

  container.append(
    el("div", { className: "field" }, [
      el("label", { className: "field-label field-row", attrs: { for: "grain-range" } }, [
        el("span", { text: "Grain" }), grainValue,
      ]),
      grain,
    ]),
    el("label", { className: "field-check", attrs: { for: "paper-toggle" } }, [
      paper, el("span", { text: "Paper texture" }),
    ]),
  );

  return {
    sync(state) {
      const percent = String(Math.round(state.finish.grain * 100));
      grain.value = percent;
      grainValue.textContent = `${percent}%`;
      paper.checked = Boolean(state.finish.paper);
    },
  };
}
