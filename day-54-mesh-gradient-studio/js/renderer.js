function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function renderMesh(context, width, height, scene) {
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.fillStyle = scene.baseColor;
  context.fillRect(0, 0, width, height);

  const radiusScale = Math.max(width, height) * scene.settings.size;
  context.globalCompositeOperation = "screen";

  scene.points.slice(0, scene.pointCount).forEach((point) => {
    const x = point.x * width;
    const y = point.y * height;
    const radius = point.radius * radiusScale;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, hexToRgba(point.color, 0.98));
    gradient.addColorStop(0.34, hexToRgba(point.color, 0.72));
    gradient.addColorStop(0.72, hexToRgba(point.color, 0.2));
    gradient.addColorStop(1, hexToRgba(point.color, 0));

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });

  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}
