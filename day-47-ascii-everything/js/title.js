// title — the masthead eats its own dog food: the wordmark is drawn to a
// hidden canvas and run through the same luminance→character idea, so the
// page's own title is generated ASCII, not pasted art.

const TEXT = 'ASCII EVERYTHING';
const COLS = 150;
const RAMP = [...'@#%*+=-:. '];
const CHAR_W_RATIO = 0.6;

export function generateTitle() {
  const pre = document.getElementById('ascii-title');

  const W = 900;
  const H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // shrink until the wordmark fits the strip
  let size = 88;
  do {
    ctx.font = `800 ${size}px "JetBrains Mono", monospace`;
    size -= 2;
  } while (ctx.measureText(TEXT).width > W - 8 && size > 10);
  ctx.fillText(TEXT, 4, H / 2 + 2);

  const rows = Math.max(4, Math.round(COLS * (H / W) * CHAR_W_RATIO));
  const sample = document.createElement('canvas');
  sample.width = COLS;
  sample.height = rows;
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(canvas, 0, 0, COLS, rows);
  const pixels = sctx.getImageData(0, 0, COLS, rows).data;

  const steps = RAMP.length - 1;
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const lum = pixels[(y * COLS + x) * 4]; // grayscale: red channel is enough
      line += RAMP[Math.round((1 - lum / 255) * steps)];
    }
    lines.push(line);
  }

  // trim fully-blank top/bottom rows and trailing spaces so the block
  // is exactly as wide as the art itself
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  if (!lines.length) return;
  pre.textContent = lines.map((line) => line.replace(/\s+$/, '')).join('\n');
  document.body.classList.add('has-ascii-title');
}
