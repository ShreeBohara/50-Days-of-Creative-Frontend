const canvas = document.querySelector("#coffee-canvas");
const context = canvas?.getContext("2d");

function drawScaffold() {
  if (!canvas || !context) return;

  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * dpr));
  canvas.height = Math.max(1, Math.round(bounds.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = "#4a271b";

  for (let index = 0; index < 1000; index += 1) {
    const angle = index * 2.399963;
    const radius = Math.sqrt(index / 1000) * Math.min(bounds.width, bounds.height) * 0.31;
    const x = bounds.width / 2 + Math.cos(angle) * radius * 1.18;
    const y = bounds.height / 2 + Math.sin(angle) * radius * 0.78;
    context.globalAlpha = 0.32 + (index % 7) * 0.055;
    context.beginPath();
    context.arc(x, y, 1.8, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
}

drawScaffold();
window.addEventListener("resize", drawScaffold, { passive: true });
