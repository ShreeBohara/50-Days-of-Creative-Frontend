// Seed section: the editable code field. Paste or type a code and press
// Enter (or leave the field) to restore that poster; the copy button puts
// the current code on the clipboard.
import { el, icon } from "./dom.js";
import { restore } from "./state.js";
import { decodeCode, encodeCode } from "./seedCode.js";

const COPY_PATH = "M9 9h10v12H9zM5 15V3h10";
const REASONS = {
  length: "Codes look like SWS-7K2Q-C or TER-M4XP-XQ9Z",
  system: "Unknown system — codes start with SWS, FLW, BAU, TER or GLT",
  layout: "The middle group has a character that isn't in the code alphabet",
  palette: "The palette group must be a letter A–H or X plus three characters",
};

export function mountSeedControls({ container, onChange, announce }) {
  let current = "";
  const input = el("input", {
    className: "input seed-input", type: "text", id: "seed-input", spellcheck: false,
    autocomplete: "off", autocapitalize: "characters",
    attrs: { "aria-label": "Seed code", "aria-describedby": "seed-error" },
  });
  const copyButton = el("button", {
    className: "btn btn-icon", type: "button", attrs: { title: "Copy code", "aria-label": "Copy seed code" },
  }, [icon(COPY_PATH, { size: 14 })]);
  const error = el("p", { className: "seed-error", id: "seed-error", attrs: { hidden: true } });

  function fail(reason) {
    input.classList.add("is-invalid");
    error.textContent = REASONS[reason] || "Not a valid code";
    error.hidden = false;
    announce(`Not a valid code. ${error.textContent}`);
  }

  function clear() {
    input.classList.remove("is-invalid");
    error.hidden = true;
  }

  function apply(value) {
    const result = decodeCode(value);
    if (!result.ok) {
      fail(result.reason);
      return false;
    }
    clear();
    onChange((state) => restore(state, result));
    announce("Poster restored from code");
    return true;
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (apply(input.value)) input.blur();
    } else if (event.key === "Escape") {
      input.value = current;
      clear();
      input.blur();
    }
  });
  input.addEventListener("paste", () => setTimeout(() => apply(input.value), 0));
  input.addEventListener("blur", () => {
    if (input.value.trim() === current) {
      clear();
      return;
    }
    if (!apply(input.value)) {
      input.value = current;
      clear();
    }
  });
  input.addEventListener("input", () => {
    if (input.classList.contains("is-invalid")) clear();
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(current);
      announce(`Copied ${current}`);
    } catch {
      input.focus();
      input.select();
      announce("Select the code and copy it");
    }
  });

  container.append(el("div", { className: "seed-row" }, [input, copyButton]), error);

  return {
    sync(state) {
      current = encodeCode(state);
      if (document.activeElement !== input) {
        input.value = current;
        clear();
      }
    },
  };
}
