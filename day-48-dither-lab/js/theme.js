// Negative-print mode (dark theme). The whole stylesheet runs on --paper and
// --ink tokens, so dark mode is a true film negative: the two swap. An inline
// head script applies the stored/OS choice before first paint; this module
// only owns the toggle button and persistence.

const KEY = "dither-lab-theme";
const osDark = window.matchMedia("(prefers-color-scheme: dark)");

function storedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

export function initTheme(button) {
  const label = button.querySelector(".neg-label");

  const sync = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    label.textContent = dark ? "negative" : "positive";
  };

  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode etc. */ }
    sync();
  });

  // follow the OS setting live, but only until the user picks a side
  osDark.addEventListener("change", (e) => {
    if (storedTheme()) return;
    document.documentElement.dataset.theme = e.matches ? "dark" : "light";
    sync();
  });

  sync();
}
