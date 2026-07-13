function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

export function buildCssBackground(scene, framePoints) {
  const gradients = framePoints
    .slice(0, scene.pointCount)
    .map((point) => {
      const x = (point.x * 100).toFixed(1);
      const y = (point.y * 100).toFixed(1);
      const radius = Math.round(point.radius * scene.settings.size * 100);
      return `radial-gradient(circle ${radius}vmax at ${x}% ${y}%, ${hexToRgba(point.color, 0.98)} 0%, ${hexToRgba(point.color, 0.66)} 34%, ${hexToRgba(point.color, 0.16)} 72%, transparent 100%)`;
    });

  return [
    `background-color: ${scene.baseColor};`,
    "background-image:",
    `  ${gradients.join(",\n  ")};`,
    "background-blend-mode: screen;",
  ].join("\n");
}

export async function copyCssBackground(scene, framePoints) {
  const css = buildCssBackground(scene, framePoints);
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(css);
    return { copied: true, css };
  } catch {
    return { copied: false, css };
  }
}
