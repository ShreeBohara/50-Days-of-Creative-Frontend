// Pooled canvas sparkle trail. No allocation in the hot path: a fixed
// pool of particles is recycled, and the rAF loop self-stops whenever
// nothing is alive so an idle cursor costs zero frames.

const COLORS = [
  [0, 0, 100], // white
  [312, 100, 76], // pink
  [187, 100, 72], // cyan
  [56, 100, 72], // yellow
];

export function createSparkleTrail(canvas, options = {}) {
  const { poolSize = 120, minDist = 8, minInterval = 16 } = options;
  const ctx = canvas.getContext("2d");

  const pool = [];
  for (let i = 0; i < poolSize; i += 1) {
    pool.push({ active: false, born: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, ttl: 1, size: 1, phase: 0, color: 0 });
  }

  let enabled = true;
  let rafId = 0;
  let running = false;
  let lastFrame = 0;
  let activeCount = 0;
  let lastEmitX = -1e9;
  let lastEmitY = -1e9;
  let lastEmitAt = 0;
  let spawnSerial = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  function takeParticle() {
    let oldest = pool[0];
    for (const p of pool) {
      if (!p.active) return p;
      if (p.born < oldest.born) oldest = p;
    }
    return oldest;
  }

  function spawn(x, y) {
    const p = takeParticle();
    if (!p.active) activeCount += 1;
    spawnSerial += 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 26;
    p.active = true;
    p.born = spawnSerial;
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y + (Math.random() - 0.5) * 6;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 8;
    p.age = 0;
    p.ttl = 0.7 + Math.random() * 0.4;
    p.size = 3 + Math.random() * 5;
    p.phase = Math.random() * Math.PI * 2;
    p.color = Math.floor(Math.random() * COLORS.length);
  }

  function handleMove(x, y, now = performance.now()) {
    if (!enabled) return;
    if (now - lastEmitAt < minInterval) return;
    const dx = x - lastEmitX;
    const dy = y - lastEmitY;
    if (dx * dx + dy * dy < minDist * minDist) return;
    lastEmitAt = now;
    lastEmitX = x;
    lastEmitY = y;
    spawn(x, y);
    if (Math.random() < 0.6) spawn(x, y);
    ensureRunning();
  }

  function step(dt) {
    for (const p of pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.ttl) {
        p.active = false;
        activeCount -= 1;
        continue;
      }
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function draw(timeSec) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    for (const p of pool) {
      if (!p.active) continue;
      const fade = 1 - p.age / p.ttl;
      const twinkle = 0.6 + 0.4 * Math.sin(p.phase + timeSec * 14);
      const alpha = Math.max(0, fade * twinkle);
      const r = p.size * (0.5 + fade * 0.5);
      const [h, s, l] = COLORS[p.color];
      ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
      ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.032);
    lastFrame = now;
    step(dt);
    draw(now / 1000);
    if (activeCount > 0) {
      rafId = requestAnimationFrame(frame);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      running = false;
    }
  }

  function ensureRunning() {
    if (running || !enabled) return;
    running = true;
    lastFrame = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function suspend() {
    cancelAnimationFrame(rafId);
    running = false;
    for (const p of pool) p.active = false;
    activeCount = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    if (!enabled) suspend();
  }

  resize();
  window.addEventListener("resize", resize);

  return {
    handleMove,
    setEnabled,
    suspend,
    // Debug/QA hooks: drive frames manually when rAF is throttled.
    step,
    draw,
    spawn,
    get activeCount() {
      return activeCount;
    },
  };
}
