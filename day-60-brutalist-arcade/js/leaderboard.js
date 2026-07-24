// HALL OF VOLT — localStorage bests for all three games with 3-letter
// arcade initials edited via A-Z steppers, AAA style.

import { el } from "./dom.js";
import { SCORE_KEY, getScores, store } from "./storage.js";
import {
  GAMES,
  cycleLetter,
  fmtValue,
  isNewBest,
  sanitizeInitials,
} from "./leaderboardLogic.js";

const INITIALS_KEY = "initials";

export function initLeaderboard() {
  const frame = document.getElementById("board-frame");
  if (!frame) return;

  const callout = el("p", "board-callout arcade", "");
  callout.setAttribute("role", "status");
  callout.hidden = true;

  const list = el("div", "board-list");
  const rows = new Map();
  let editorOpenFor = null;

  GAMES.forEach((game) => {
    const row = el("div", "board-row");
    row.dataset.game = game.key;
    const name = el("span", "board-game", game.label);
    const value = el("span", "board-value arcade", "———");
    const initials = el("span", "board-initials arcade", "···");
    const editBtn = el("button", "btn-mini", "EDIT");
    editBtn.type = "button";
    editBtn.setAttribute("aria-label", `Edit initials for ${game.label}`);
    editBtn.addEventListener("click", () => openEditor(game.key, { focus: true }));
    const editorHost = el("div", "board-editor-host");
    row.append(name, value, initials, editBtn, editorHost);
    rows.set(game.key, { row, value, initials, editBtn, editorHost });
    list.append(row);
  });

  frame.append(callout, list);

  function render() {
    const scores = getScores();
    GAMES.forEach((game) => {
      const r = rows.get(game.key);
      const entry = scores[game.key];
      r.value.textContent = fmtValue(game.key, entry);
      r.initials.textContent = entry ? sanitizeInitials(entry.initials) : "···";
      r.editBtn.disabled = !entry;
    });
  }

  function closeEditor() {
    if (!editorOpenFor) return;
    const r = rows.get(editorOpenFor);
    r.editorHost.replaceChildren();
    r.row.classList.remove("is-editing");
    editorOpenFor = null;
  }

  function openEditor(gameKey, { focus = false } = {}) {
    closeEditor();
    const entry = getScores()[gameKey];
    if (!entry) return;
    editorOpenFor = gameKey;
    const r = rows.get(gameKey);
    r.row.classList.add("is-editing");

    const letters = sanitizeInitials(entry.initials).split("");
    const editor = el("div", "ini-editor");
    letters.forEach((letter, i) => {
      const slot = el("div", "ini-slot");
      const up = el("button", "ini-step", "▲");
      up.type = "button";
      up.setAttribute("aria-label", `Letter ${i + 1} up`);
      const face = el("span", "ini-letter arcade", letter);
      const down = el("button", "ini-step", "▼");
      down.type = "button";
      down.setAttribute("aria-label", `Letter ${i + 1} down`);
      up.addEventListener("click", () => {
        letters[i] = cycleLetter(letters[i], 1);
        face.textContent = letters[i];
      });
      down.addEventListener("click", () => {
        letters[i] = cycleLetter(letters[i], -1);
        face.textContent = letters[i];
      });
      slot.append(up, face, down);
      editor.append(slot);
    });

    const save = el("button", "btn btn-save", "SAVE");
    save.type = "button";
    const cancel = el("button", "btn btn-ghost btn-save", "NAH");
    cancel.type = "button";
    save.addEventListener("click", () => {
      const initials = sanitizeInitials(letters.join(""));
      const fresh = getScores();
      if (fresh[gameKey]) {
        fresh[gameKey] = { ...fresh[gameKey], initials };
        store.set(SCORE_KEY, fresh);
        store.set(INITIALS_KEY, initials);
        document.dispatchEvent(new CustomEvent("voltage:scores"));
      }
      closeEditor();
    });
    cancel.addEventListener("click", closeEditor);
    editor.append(save, cancel);
    r.editorHost.append(editor);

    if (focus) {
      const firstStep = editor.querySelector(".ini-step");
      if (firstStep) firstStep.focus({ preventScroll: true });
    }
  }

  function onGameOver(event) {
    const { game: gameKey, value, timeMs } = event.detail || {};
    const conf = GAMES.find((g) => g.key === gameKey);
    if (!conf) return;
    const scores = getScores();
    if (!isNewBest(gameKey, value, scores[gameKey])) return;

    const initials = sanitizeInitials(store.get(INITIALS_KEY, "AAA"));
    const entry = { value, initials };
    if (Number.isFinite(timeMs)) entry.timeMs = timeMs;
    scores[gameKey] = entry;
    store.set(SCORE_KEY, scores);
    document.dispatchEvent(new CustomEvent("voltage:scores"));

    callout.textContent = `NEW BEST — ${conf.label}: ${fmtValue(gameKey, entry)}. CLAIM YOUR LETTERS BELOW.`;
    callout.hidden = false;
    const r = rows.get(gameKey);
    r.row.classList.remove("is-new");
    void r.row.offsetWidth;
    r.row.classList.add("is-new");
    // No focus steal: the player is still up at the game they just finished.
    openEditor(gameKey, { focus: false });
  }

  document.addEventListener("voltage:gameover", onGameOver);
  document.addEventListener("voltage:scores", render);
  render();

  window.__arcade = window.__arcade || {};
  window.__arcade.leaderboard = { render, openEditor };
}
