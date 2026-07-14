import { FLAP_CHARSET } from "./charset.js";

export function normalizeMessageText(value) {
  const decomposed = String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\r\n?/g, "\n")
    .toUpperCase();

  return Array.from(decomposed, (character) => {
    if (character === "\n") return "\n";
    if (/\s/u.test(character)) return " ";
    return FLAP_CHARSET.includes(character) ? character : " ";
  }).join("");
}

function wrapParagraph(paragraph, columns) {
  const words = paragraph.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let currentLine = "";

  for (const originalWord of words) {
    let word = originalWord;
    while (word.length > columns) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      lines.push(word.slice(0, columns));
      word = word.slice(columns);
    }

    if (!word) continue;
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= columns) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export function wrapMessage(value, { columns, rows = 6 } = {}) {
  const safeColumns = Math.max(1, Number(columns) || 22);
  const safeRows = Math.max(1, Number(rows) || 6);
  const normalized = normalizeMessageText(value);
  const wrapped = normalized
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, safeColumns));
  const capacity = safeColumns * safeRows;
  const characterCount = Array.from(normalized.replace(/\n/g, "")).length;

  return {
    normalized,
    lines: wrapped.slice(0, safeRows),
    allLines: wrapped,
    capacity,
    characterCount,
    truncated: wrapped.length > safeRows,
  };
}

export function createMessageMode(options) {
  const { input, counter } = options;
  let source = input.value;
  let active = false;
  let debounceTimer = 0;

  function getComposition() {
    return wrapMessage(source, {
      columns: options.getColumns(),
      rows: options.rows ?? 6,
    });
  }

  function syncCounter(composition) {
    counter.value = `${composition.characterCount} / ${composition.capacity}`;
    counter.classList.toggle("is-overflow", composition.truncated);
    counter.dataset.truncated = String(composition.truncated);
  }

  function render({ announce = false } = {}) {
    const composition = getComposition();
    syncCounter(composition);
    options.setBoard(composition.lines);
    if (announce) {
      options.announce?.(composition.truncated
        ? `Message displayed and truncated to ${composition.capacity} board positions`
        : "Message displayed on the split-flap board");
    }
    return composition;
  }

  function scheduleRender() {
    window.clearTimeout(debounceTimer);
    const composition = getComposition();
    syncCounter(composition);
    if (!active) return;
    debounceTimer = window.setTimeout(() => render({ announce: true }), 120);
  }

  function onInput() {
    source = input.value;
    scheduleRender();
  }

  input.addEventListener("input", onInput);
  syncCounter(getComposition());

  return {
    activate() {
      active = true;
      return render();
    },
    deactivate() {
      active = false;
      window.clearTimeout(debounceTimer);
    },
    resize() {
      if (active) return render();
      const composition = getComposition();
      syncCounter(composition);
      return composition;
    },
    setSource(nextSource, { syncInput = true, announce = false } = {}) {
      source = String(nextSource ?? "");
      if (syncInput) input.value = source;
      return active ? render({ announce }) : getComposition();
    },
    get source() {
      return source;
    },
    destroy() {
      active = false;
      window.clearTimeout(debounceTimer);
      input.removeEventListener("input", onInput);
    },
  };
}
