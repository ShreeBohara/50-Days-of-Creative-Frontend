// Square confetti. Squares only — the physics may curve, the corners never do.

const COLORS = ["#ffe600", "#ff2e88", "#00e5ff", "#b6ff00", "#000000", "#ffffff"];
const GRAVITY = 1500; // px/s^2
const MAX_DT = 0.05;

export function createConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  let parts = [];
  let raf = null;
  let last = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tick(now) {
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, width, height);
    parts = parts.filter((p) => (p.age += dt) < p.life);
    for (const p of parts) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      // blink out flat at the end instead of a soft fade — house style
      if (p.age / p.life > 0.82 && Math.floor(p.age * 20) % 2 === 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    if (parts.length > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
      ctx.clearRect(0, 0, width, height);
    }
  }

  function burst(count = 140) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    resize();
    for (let i = 0; i < count; i += 1) {
      parts.push({
        x: width * (0.3 + Math.random() * 0.4),
        y: height * (0.25 + Math.random() * 0.2),
        vx: (Math.random() - 0.5) * 1100,
        vy: -350 - Math.random() * 650,
        size: 6 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        color: COLORS[i % COLORS.length],
        life: 1.3 + Math.random() * 0.6,
        age: 0,
      });
    }
    if (raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  return { burst, resize };
}
