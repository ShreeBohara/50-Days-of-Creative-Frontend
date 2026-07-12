const canvas = document.querySelector("#mesh-canvas");
const context = canvas.getContext("2d", { alpha: false });
const status = document.querySelector("#boot-status");

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
  context.fillStyle = "#061a24";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas, { passive: true });
status.textContent = "Color field online";
