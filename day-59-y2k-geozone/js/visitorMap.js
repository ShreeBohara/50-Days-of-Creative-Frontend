// The classic fake "who's online" box. The dots blink in CSS; JS only
// drifts the reassuringly-made-up visitor count now and then.

export function initVisitorMap({ countEl }) {
  let count = 6 + Math.floor(Math.random() * 7);
  let timer = 0;

  function render() {
    countEl.textContent = String(count);
  }

  function drift() {
    const delta = Math.random() < 0.5 ? -1 : 1;
    count = Math.min(23, Math.max(2, count + delta));
    render();
    scheduleNext();
  }

  function scheduleNext() {
    timer = setTimeout(drift, 8000 + Math.random() * 7000);
  }

  function suspend() {
    clearTimeout(timer);
  }

  function resume() {
    clearTimeout(timer);
    scheduleNext();
  }

  render();
  scheduleNext();

  return { suspend, resume };
}
