// Tiny DOM helpers. The controls are built with createElement (never markup
// strings) so every node is typed, wired and accessible by construction.

/**
 * el("button", { className: "btn", text: "Reroll", type: "button",
 *   attrs: { "aria-pressed": "false" }, on: { click: fn } }, [children])
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  const { className, text, attrs, dataset, on, style, ...props } = options;
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      node.setAttribute(name, value === true ? "" : String(value));
    }
  }
  if (dataset) Object.assign(node.dataset, dataset);
  if (style) Object.assign(node.style, style);
  if (on) {
    for (const [event, handler] of Object.entries(on)) node.addEventListener(event, handler);
  }
  for (const [name, value] of Object.entries(props)) node[name] = value;
  for (const child of [].concat(children)) {
    if (child != null && child !== false) node.append(child);
  }
  return node;
}

/** Inline SVG icon from a path `d` string (24×24 viewBox, stroked, currentColor). */
export function icon(d, { size = 14, stroke = 2 } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(stroke));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}

/** Returns an announce(message) function bound to an aria-live region. */
export function createAnnouncer(region) {
  let timer = 0;
  return (message) => {
    if (!region) return;
    region.textContent = "";
    clearTimeout(timer);
    timer = setTimeout(() => {
      region.textContent = message;
    }, 30);
  };
}

/** Debounce that also exposes flush() for tests and blur handlers. */
export function debounce(fn, wait) {
  let timer = 0;
  let pending = null;
  const run = () => {
    timer = 0;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };
  const debounced = (...args) => {
    pending = args;
    clearTimeout(timer);
    timer = setTimeout(run, wait);
  };
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      run();
    }
  };
  return debounced;
}
