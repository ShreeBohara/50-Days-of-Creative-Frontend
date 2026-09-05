// Text section: headline, subline and date inputs. Typing is debounced so
// the poster (and the five minis) re-render a few times a second, not on
// every keystroke; Enter or blur flushes immediately.
import { el, debounce } from "./dom.js";
import { setText, HEADLINE_MAX, LINE_MAX } from "./state.js";

const FIELDS = [
  { key: "headline", label: "Headline", max: HEADLINE_MAX, placeholder: "VOLTAGE" },
  { key: "subline", label: "Subline", max: LINE_MAX, placeholder: "optional" },
  { key: "date", label: "Date line", max: LINE_MAX, placeholder: "optional" },
];

export function mountTextControls({ container, onChange }) {
  const inputs = new Map();
  for (const field of FIELDS) {
    const input = el("input", {
      className: "input", type: "text", id: `text-${field.key}`, maxLength: field.max,
      placeholder: field.placeholder, autocomplete: "off", spellcheck: false,
    });
    const push = debounce(() => onChange((state) => setText(state, { [field.key]: input.value })), 120);
    input.addEventListener("input", push);
    input.addEventListener("blur", () => push.flush());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        push.flush();
        input.blur();
      }
    });
    inputs.set(field.key, input);
    container.append(el("div", { className: "field" }, [
      el("label", { className: "field-label", attrs: { for: input.id }, text: field.label }),
      input,
    ]));
  }
  return {
    sync(state) {
      for (const [key, input] of inputs) {
        if (document.activeElement !== input && input.value !== state.text[key]) input.value = state.text[key];
      }
    },
  };
}
