const TAU = Math.PI * 2;

function withContext(context, callback) {
  context.save();
  callback();
  context.restore();
}

function drawLabel(context, text, x, y, options = {}) {
  context.fillStyle = options.color ?? "#634b40";
  context.globalAlpha *= options.alpha ?? 1;
  context.font = options.font ?? '650 11px "Archivo", sans-serif';
  context.textAlign = options.align ?? "left";
  context.textBaseline = options.baseline ?? "middle";
  context.fillText(text, x, y);
}

function drawArrow(context, overlay) {
  const startX = overlay.x;
  const startY = overlay.y + 10;
  const endX = overlay.targetX;
  const endY = overlay.targetY;
  const angle = Math.atan2(endY - startY, endX - startX);

  context.strokeStyle = overlay.color ?? "#634b40";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - Math.cos(angle - 0.52) * 7, endY - Math.sin(angle - 0.52) * 7);
  context.moveTo(endX, endY);
  context.lineTo(endX - Math.cos(angle + 0.52) * 7, endY - Math.sin(angle + 0.52) * 7);
  context.stroke();
}

function drawTrendPath(context, points) {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
}

function drawAnnotation(context, overlay) {
  drawArrow(context, overlay);
  drawLabel(context, overlay.text, overlay.x, overlay.y, {
    align: overlay.align,
    color: overlay.color,
    font: '700 10px "Archivo", sans-serif',
  });
  if (overlay.detail) {
    drawLabel(context, overlay.detail, overlay.x, overlay.y + 15, {
      align: overlay.align,
      color: overlay.color,
      alpha: 0.78,
      font: 'italic 13px "Newsreader", serif',
    });
  }
}

function drawOverlay(context, overlay) {
  switch (overlay.type) {
    case "halo": {
      const gradient = context.createRadialGradient(
        overlay.x,
        overlay.y,
        0,
        overlay.x,
        overlay.y,
        overlay.radius,
      );
      gradient.addColorStop(0, overlay.color);
      gradient.addColorStop(1, "rgba(201, 169, 133, 0)");
      context.globalAlpha *= overlay.alpha;
      context.fillStyle = gradient;
      context.fillRect(
        overlay.x - overlay.radius,
        overlay.y - overlay.radius,
        overlay.radius * 2,
        overlay.radius * 2,
      );
      break;
    }
    case "scene-note":
      drawLabel(context, overlay.text, overlay.x, overlay.y, {
        align: overlay.align,
        font: '600 10px "Archivo", sans-serif',
      });
      break;
    case "grid-frame":
      context.strokeStyle = "rgba(42, 25, 19, 0.2)";
      context.lineWidth = 1;
      context.strokeRect(overlay.x - 7, overlay.y - 7, overlay.width + 14, overlay.height + 14);
      break;
    case "cluster-label":
      context.fillStyle = overlay.color;
      context.beginPath();
      context.arc(overlay.x - 7, overlay.y, 3, 0, TAU);
      context.fill();
      drawLabel(context, overlay.text, overlay.x, overlay.y, {
        align: overlay.align,
        color: overlay.color,
        font: '720 10px "Archivo", sans-serif',
      });
      break;
    case "month-axis":
      context.strokeStyle = "rgba(42, 25, 19, 0.28)";
      context.beginPath();
      context.moveTo(overlay.labels[0].x - 20, overlay.baseline + 4);
      context.lineTo(overlay.labels.at(-1).x + 20, overlay.baseline + 4);
      context.stroke();
      overlay.labels.forEach((label) => {
        drawLabel(context, label.label, label.x, label.y + 11, {
          align: "center",
          font: '700 9px "Archivo", sans-serif',
        });
        drawLabel(context, String(label.count), label.x, label.y + 24, {
          align: "center",
          alpha: 0.72,
          font: 'italic 11px "Newsreader", serif',
        });
      });
      break;
    case "clock-face":
      context.strokeStyle = "rgba(42, 25, 19, 0.18)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(overlay.center.x, overlay.center.y, overlay.radius, 0, TAU);
      context.stroke();
      overlay.hours.forEach((hour) => {
        const angle = -Math.PI / 2 + (hour.hour / 24) * TAU;
        const inner = overlay.radius + overlay.band * 0.56;
        const outer = overlay.radius + overlay.band * (0.72 + hour.density * 0.22);
        context.strokeStyle = `rgba(42, 25, 19, ${0.18 + hour.density * 0.58})`;
        context.lineWidth = hour.hour % 3 === 0 ? 1.5 : 1;
        context.beginPath();
        context.moveTo(
          overlay.center.x + Math.cos(angle) * inner,
          overlay.center.y + Math.sin(angle) * inner,
        );
        context.lineTo(
          overlay.center.x + Math.cos(angle) * outer,
          overlay.center.y + Math.sin(angle) * outer,
        );
        context.stroke();
        if (hour.hour % 3 !== 0) return;
        drawLabel(context, hour.label, hour.x, hour.y, {
          align: "center",
          font: '700 9px "Archivo", sans-serif',
        });
      });
      drawLabel(context, "24 HOURS", overlay.center.x, overlay.center.y - 8, {
        align: "center",
        font: '750 10px "Archivo", sans-serif',
      });
      drawLabel(context, "brightness = frequency", overlay.center.x, overlay.center.y + 10, {
        align: "center",
        alpha: 0.72,
        font: 'italic 12px "Newsreader", serif',
      });
      break;
    case "trend-area":
      drawTrendPath(context, overlay.points);
      context.lineTo(overlay.points.at(-1).x, overlay.baseline);
      context.lineTo(overlay.points[0].x, overlay.baseline);
      context.closePath();
      context.fillStyle = overlay.color;
      context.globalAlpha *= overlay.alpha;
      context.fill();
      break;
    case "trend-line":
      drawTrendPath(context, overlay.points);
      context.strokeStyle = overlay.color;
      context.globalAlpha *= overlay.alpha;
      context.lineWidth = 1.5;
      context.stroke();
      break;
    case "trend-axis":
      context.strokeStyle = "rgba(42, 25, 19, 0.1)";
      context.lineWidth = 1;
      [0, 0.5, 1].forEach((ratio) => {
        const y = overlay.baseline - (overlay.baseline - overlay.top) * ratio;
        context.beginPath();
        context.moveTo(overlay.labels[0].x, y);
        context.lineTo(overlay.labels.at(-1).x, y);
        context.stroke();
      });
      drawLabel(context, "CUPS / DAY", overlay.labels[0].x, overlay.top - 11, {
        align: "left",
        font: '700 9px "Archivo", sans-serif',
      });
      overlay.labels.forEach((label) => {
        drawLabel(context, label.text, label.x, label.y + 12, {
          align: "center",
          font: '700 9px "Archivo", sans-serif',
        });
      });
      break;
    case "spotlight": {
      const gradient = context.createRadialGradient(
        overlay.x,
        overlay.y,
        0,
        overlay.x,
        overlay.y,
        overlay.radius,
      );
      gradient.addColorStop(0, overlay.color);
      gradient.addColorStop(1, "rgba(184, 62, 46, 0)");
      context.globalAlpha *= overlay.alpha;
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(overlay.x, overlay.y, overlay.radius, 0, TAU);
      context.fill();
      break;
    }
    case "annotation":
      drawAnnotation(context, overlay);
      break;
    default:
      break;
  }
}

function drawOutlierPulse(context, frame) {
  const pulse = 0.5 + Math.sin(frame.now * 0.006) * 0.5;
  context.strokeStyle = "#b43b2f";
  context.lineWidth = 1;
  frame.particles.forEach((particle) => {
    if (!particle.meta?.highlighted) return;
    context.globalAlpha = 0.18 + pulse * 0.28;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius + 3 + pulse * 4, 0, TAU);
    context.stroke();
  });
}

function drawConstellation(context, frame) {
  const groups = new Map();
  frame.particles.forEach((particle) => {
    const part = particle.meta?.part;
    if (!part) return;
    if (!groups.has(part)) groups.set(part, []);
    groups.get(part).push(particle);
  });

  context.strokeStyle = "rgba(84, 53, 38, 0.16)";
  context.lineWidth = 0.75;
  groups.forEach((particles) => {
    particles.sort((left, right) => (left.meta.rank ?? 0) - (right.meta.rank ?? 0));
    context.beginPath();
    let previous = null;
    particles.forEach((particle) => {
      const distance = previous
        ? Math.hypot(particle.x - previous.x, particle.y - previous.y)
        : Infinity;
      if (!previous || distance > 46) context.moveTo(particle.x, particle.y);
      else context.lineTo(particle.x, particle.y);
      previous = particle;
    });
    context.stroke();
  });
}

export class SceneOverlayRenderer {
  constructor() {
    this.scene = null;
    this.startedAt = 0;
    this.duration = 260;
    this.reducedMotion = false;
  }

  setScene(scene, options = {}) {
    this.scene = scene;
    this.startedAt = options.now ?? performance.now();
    this.reducedMotion = Boolean(options.reducedMotion);
  }

  setReducedMotion(reduced) {
    this.reducedMotion = Boolean(reduced);
  }

  render(context, frame) {
    if (!this.scene) return false;
    const progress = this.reducedMotion
      ? 1
      : Math.min(1, Math.max(0, (frame.now - this.startedAt) / this.duration));

    withContext(context, () => {
      context.globalAlpha = progress;
      if (this.scene.id === "finale") drawConstellation(context, frame);
      this.scene.overlays.forEach((overlay) => {
        withContext(context, () => drawOverlay(context, overlay));
      });
      if (this.scene.id === "outlier" && !this.reducedMotion) {
        drawOutlierPulse(context, frame);
      }
    });

    return progress < 1 || (this.scene.id === "outlier" && !this.reducedMotion);
  }
}

export default SceneOverlayRenderer;
