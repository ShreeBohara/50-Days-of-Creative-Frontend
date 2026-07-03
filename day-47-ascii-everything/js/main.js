// day 47 — ASCII EVERYTHING
// boot: wire tabs + statusbar shell. Engine and sources arrive in later stages.

const statusMode = document.getElementById('status-mode');
const tabs = [...document.querySelectorAll('.tab')];

let activeMode = 'demo';

export function setMode(mode) {
  activeMode = mode;
  tabs.forEach((tab) => {
    const on = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  statusMode.textContent = `MODE:${mode.toUpperCase()}`;
  document.dispatchEvent(new CustomEvent('modechange', { detail: { mode } }));
}

export function getMode() {
  return activeMode;
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

// toast helper shared by later modules
let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

setMode('demo');
