const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function sampleMotion(scene, seconds, noise) {
  const driftTime = seconds * scene.settings.speed * 0.16;

  return scene.points.map((point, index) => {
    const offset = index * 17.37;
    const driftX = noise.noise2D(point.seedX + driftTime, point.seedY + offset);
    const driftY = noise.noise2D(point.seedY - driftTime * 0.83, point.seedX + offset + 31.8);
    const pulseNoise = noise.noise2D(point.seedX + driftTime * 0.42, point.seedY - 61.4);
    const pulse = Math.sin(seconds * 0.48 + point.phase) * 0.045 + pulseNoise * 0.025;

    return {
      ...point,
      x: clamp(point.x + driftX * 0.145, 0.02, 0.98),
      y: clamp(point.y + driftY * 0.145, 0.02, 0.98),
      radius: point.radius * (1 + pulse),
    };
  });
}
