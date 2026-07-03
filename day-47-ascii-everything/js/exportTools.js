// export — the frame you see, yours to keep: plain text or PNG.

import { getTextFrame, getCanvas } from './engine.js';
import { toast } from './main.js';

const exportBody = document.getElementById('export-body');

function makeButton(label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-export';
  btn.textContent = label;
  return btn;
}

const copyBtn = makeButton('COPY AS TEXT');
copyBtn.addEventListener('click', async () => {
  const text = getTextFrame();
  if (!text) {
    toast('// NOTHING TO COPY YET');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    const lines = text.split('\n');
    toast(`// COPIED ${lines.length}×${lines[0].length} CHARS`);
  } catch {
    toast('// CLIPBOARD BLOCKED — try again after clicking the page');
  }
});

const pngBtn = makeButton('DOWNLOAD PNG');
pngBtn.addEventListener('click', () => {
  // the live canvas has a transparent background — composite it over the
  // page's phosphor-black so the PNG stands on its own
  const source = getCanvas();
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const octx = out.getContext('2d');
  octx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#050807';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(source, 0, 0);
  out.toBlob((blob) => {
    if (!blob) {
      toast('// EXPORT FAILED');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ascii-everything-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    toast('// PNG SAVED');
  }, 'image/png');
});

const row = document.createElement('div');
row.className = 'export-row';
row.append(copyBtn, pngBtn);
exportBody.append(row);
