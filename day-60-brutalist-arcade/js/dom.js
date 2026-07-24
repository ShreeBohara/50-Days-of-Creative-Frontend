// Tiny DOM helpers. The house rule (and a PreToolUse hook) bans innerHTML,
// so everything is built the honest way.

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Labeled HUD stat with a setter, e.g. SCORE / 120.
export function hudStat(label, initial) {
  const root = el("div", "hud-stat");
  const labelNode = el("span", "hud-label", label);
  const valueNode = el("span", "hud-value arcade", initial);
  root.append(labelNode, valueNode);
  return {
    root,
    set(value) {
      valueNode.textContent = String(value);
    },
    flash() {
      valueNode.classList.remove("is-bumped");
      // restart the bump animation
      void valueNode.offsetWidth;
      valueNode.classList.add("is-bumped");
    },
  };
}

export function svgIcon(id, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (className) svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}
