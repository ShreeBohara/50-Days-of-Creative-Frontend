import { createGrainTexture, drawSurfaceEffects } from "./effects.js";

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getSurfaceDimensions(cssWidth, cssHeight, devicePixelRatio = 1) {
  const dpr = Math.min(Math.max(devicePixelRatio || 1, 1), 2);
  return {
    cssWidth: Math.max(1, Math.round(cssWidth)),
    cssHeight: Math.max(1, Math.round(cssHeight)),
    displayWidth: Math.max(1, Math.round(cssWidth * dpr)),
    displayHeight: Math.max(1, Math.round(cssHeight * dpr)),
    workWidth: Math.max(1, Math.ceil(cssWidth / 8)),
    workHeight: Math.max(1, Math.ceil(cssHeight / 8)),
    dpr,
  };
}

export function renderMesh(context, width, height, scene, framePoints = scene.points) {
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.fillStyle = scene.baseColor;
  context.fillRect(0, 0, width, height);

  const radiusScale = Math.max(width, height) * scene.settings.size;
  context.globalCompositeOperation = "screen";

  framePoints.slice(0, scene.pointCount).forEach((point) => {
    const x = point.x * width;
    const y = point.y * height;
    const radius = point.radius * radiusScale;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, hexToRgba(point.color, 0.98));
    gradient.addColorStop(0.34, hexToRgba(point.color, 0.72));
    gradient.addColorStop(0.72, hexToRgba(point.color, 0.2));
    gradient.addColorStop(1, hexToRgba(point.color, 0));

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });

  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}

export function createMeshRenderer(canvas) {
  const displayContext = canvas.getContext("2d", { alpha: false });
  const workCanvas = document.createElement("canvas");
  const workContext = workCanvas.getContext("2d", { alpha: false });
  const compositeCanvas = document.createElement("canvas");
  const compositeContext = compositeCanvas.getContext("2d", { alpha: false });
  const transitionCanvas = document.createElement("canvas");
  const transitionContext = transitionCanvas.getContext("2d", { alpha: false });
  const exportWorkCanvas = document.createElement("canvas");
  const exportWorkContext = exportWorkCanvas.getContext("2d", { alpha: false });
  const exportCompositeCanvas = document.createElement("canvas");
  const exportCompositeContext = exportCompositeCanvas.getContext("2d", { alpha: false });
  const exportTransitionCanvas = document.createElement("canvas");
  const exportTransitionContext = exportTransitionCanvas.getContext("2d", { alpha: false });
  const grainTexture = createGrainTexture();
  let dimensions = getSurfaceDimensions(1, 1);

  exportWorkCanvas.width = 240;
  exportWorkCanvas.height = 135;
  exportCompositeCanvas.width = 240;
  exportCompositeCanvas.height = 135;
  exportTransitionCanvas.width = 240;
  exportTransitionCanvas.height = 135;

  function compositeFrame(context, previousCanvas, nextCanvas, transitionProgress) {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    if (transitionProgress < 1) {
      context.drawImage(previousCanvas, 0, 0);
      context.globalAlpha = Math.max(0, transitionProgress);
    }
    context.drawImage(nextCanvas, 0, 0);
    context.globalAlpha = 1;
  }

  function resize(
    cssWidth = window.innerWidth,
    cssHeight = window.innerHeight,
    devicePixelRatio = window.devicePixelRatio,
  ) {
    dimensions = getSurfaceDimensions(cssWidth, cssHeight, devicePixelRatio);
    canvas.width = dimensions.displayWidth;
    canvas.height = dimensions.displayHeight;
    workCanvas.width = dimensions.workWidth;
    workCanvas.height = dimensions.workHeight;
    compositeCanvas.width = dimensions.workWidth;
    compositeCanvas.height = dimensions.workHeight;
    transitionCanvas.width = dimensions.workWidth;
    transitionCanvas.height = dimensions.workHeight;
    return dimensions;
  }

  function render(scene, framePoints = scene.points, { transitionProgress = 1 } = {}) {
    renderMesh(workContext, workCanvas.width, workCanvas.height, scene, framePoints);
    compositeFrame(compositeContext, transitionCanvas, workCanvas, transitionProgress);

    // Keep a normalized 16:9 mesh in sync with the visible frame. PNG export
    // can then capture an in-progress crossfade without inheriting viewport shape.
    renderMesh(
      exportWorkContext,
      exportWorkCanvas.width,
      exportWorkCanvas.height,
      scene,
      framePoints,
    );
    compositeFrame(
      exportCompositeContext,
      exportTransitionCanvas,
      exportWorkCanvas,
      transitionProgress,
    );

    displayContext.globalAlpha = 1;
    displayContext.globalCompositeOperation = "source-over";
    displayContext.imageSmoothingEnabled = true;
    displayContext.imageSmoothingQuality = "high";
    displayContext.drawImage(
      compositeCanvas,
      0,
      0,
      compositeCanvas.width,
      compositeCanvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    drawSurfaceEffects(displayContext, canvas.width, canvas.height, scene.settings, grainTexture);
  }

  function captureTransition() {
    transitionContext.globalAlpha = 1;
    transitionContext.globalCompositeOperation = "copy";
    transitionContext.drawImage(compositeCanvas, 0, 0);
    transitionContext.globalCompositeOperation = "source-over";
    exportTransitionContext.globalAlpha = 1;
    exportTransitionContext.globalCompositeOperation = "copy";
    exportTransitionContext.drawImage(exportCompositeCanvas, 0, 0);
    exportTransitionContext.globalCompositeOperation = "source-over";
  }

  return {
    get dimensions() {
      return dimensions;
    },
    get displayContext() {
      return displayContext;
    },
    get workCanvas() {
      return workCanvas;
    },
    get grainTexture() {
      return grainTexture;
    },
    get exportCompositeCanvas() {
      return exportCompositeCanvas;
    },
    captureTransition,
    resize,
    render,
  };
}
