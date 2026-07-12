function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGrainValues(pixelCount, seed = 5406) {
  const random = mulberry32(seed);
  return Uint8Array.from({ length: pixelCount }, () => Math.floor(random() * 256));
}

export function createGrainTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const values = createGrainValues(size * size);
  const image = context.createImageData(size, size);

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const offset = index * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

export function drawSurfaceEffects(context, width, height, settings, grainTexture) {
  if (settings.grain > 0 && grainTexture) {
    context.save();
    context.globalCompositeOperation = "overlay";
    context.globalAlpha = Math.min(0.2, Math.max(0, settings.grain));
    context.fillStyle = context.createPattern(grainTexture, "repeat");
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  if (settings.vignette) {
    const centerX = width / 2;
    const centerY = height / 2;
    const innerRadius = Math.min(width, height) * 0.18;
    const outerRadius = Math.hypot(width, height) * 0.62;
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      innerRadius,
      centerX,
      centerY,
      outerRadius,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.58, "rgba(0, 0, 0, 0.02)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
}
