// Odometer-style LCD counter. Each digit is a 1em window over a
// 10em strip of glyphs; showing digit d is translateY(-d * 10%).

export function digitsFor(value, minWidth = 6) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return [...String(safe).padStart(minWidth, "0")].map(Number);
}

export function createOdometer(root, { width = 6 } = {}) {
  const columns = [];

  function buildStrip() {
    const strip = document.createElement("span");
    strip.className = "digit-strip";
    for (let d = 0; d <= 9; d += 1) {
      const cell = document.createElement("span");
      cell.className = "digit-cell";
      cell.textContent = String(d);
      strip.appendChild(cell);
    }
    return strip;
  }

  function addColumn(atFront = false) {
    const windowEl = document.createElement("span");
    windowEl.className = "digit-window";
    windowEl.appendChild(buildStrip());
    if (atFront) {
      root.prepend(windowEl);
      columns.unshift(windowEl);
    } else {
      root.appendChild(windowEl);
      columns.push(windowEl);
    }
  }

  root.setAttribute("aria-hidden", "true");
  for (let i = 0; i < width; i += 1) addColumn();

  function setValue(value, { animate = true } = {}) {
    const digits = digitsFor(value, width);
    while (columns.length < digits.length) addColumn(true);
    root.classList.toggle("no-roll", !animate);
    for (let i = 0; i < columns.length; i += 1) {
      const strip = columns[i].firstChild;
      const digit = digits[i] ?? 0;
      // Rightmost column rolls first, cascading left like a real odometer.
      strip.style.transitionDelay = animate ? `${(columns.length - 1 - i) * 90}ms` : "0ms";
      strip.style.transform = `translateY(${-digit * 10}%)`;
    }
  }

  return { setValue };
}
