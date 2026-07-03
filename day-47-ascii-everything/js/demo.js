// demo source — wandering metaball-ish blobs on a small offscreen canvas.
// Radial gradients composited with 'lighter' merge into soft masses; the
// engine's luminance pass turns the glow into character density.

const W = 320;
const H = 180;

const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// each blob wanders on layered sine paths (cheap organic motion, no noise lib)
const blobs = Array.from({ length: 6 }, (_, i) => ({
  seed: i * 137.5,
  radius: 28 + (i % 3) * 14,
  speed: 0.00022 + i * 0.00004,
}));

function blobPos(blob, t) {
  const a = t * blob.speed + blob.seed;
  return {
    x: W * 0.5 + Math.sin(a * 1.7) * W * 0.34 + Math.sin(a * 0.63 + 2) * W * 0.12,
    y: H * 0.5 + Math.cos(a * 1.3) * H * 0.32 + Math.cos(a * 0.87 + 5) * H * 0.1,
    r: blob.radius * (0.85 + 0.15 * Math.sin(a * 2.1)),
  };
}

function tick(t) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  for (const blob of blobs) {
    const { x, y, r } = blobPos(blob, t);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, 'rgba(180,180,180,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // a slow orbiting satellite dot for a fine bright detail
  const oa = t * 0.0005;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(W / 2 + Math.cos(oa) * W * 0.42, H / 2 + Math.sin(oa) * H * 0.4, 5, 0, Math.PI * 2);
  ctx.fill();
}

export const demoSource = {
  drawable: canvas,
  width: () => W,
  height: () => H,
  tick,
};
