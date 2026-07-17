import { coffeeData } from "./data.js";
import {
  findNearestParticle,
  formatCoffeeTooltip,
  gridIndexForKey,
  positionTooltip,
} from "./interactions.js";
import ParticleEngine from "./particle-engine.js";
import { DRINK_COLORS, SCENE_IDS, computeScene } from "./scenes.js";
import SceneOverlayRenderer from "./scene-renderer.js";
import { createScrollyController } from "./scrolly.js";
import {
  buildDrinkLegendItems,
  buildFinaleSummary,
  buildTrendComparison,
  coffeeStats,
} from "./stats.js";

const canvas = document.querySelector("#coffee-canvas");
const canvasWrap = document.querySelector(".canvas-wrap");
const tooltip = document.querySelector("[data-tooltip]");
const chartSummary = document.querySelector("#chart-summary");
const sceneIndex = document.querySelector("[data-scene-index]");
const sceneTitle = document.querySelector("[data-scene-title]");
const finaleCard = document.querySelector("[data-finale-card]");
const drinkLegend = document.querySelector("[data-drink-legend]");
const monthCallout = document.querySelector("[data-month-callout]");
const clockReadout = document.querySelector("[data-clock-readout]");
const trendReadout = document.querySelector("[data-trend-readout]");
const motionToggle = document.querySelector("[data-motion-toggle]");
const motionLabel = motionToggle?.querySelector("span");
const steps = [...document.querySelectorAll("[data-step]")];
const railItems = [...document.querySelectorAll("[data-step-target]")];

if (!canvas || !canvasWrap) {
  throw new Error("The coffee story canvas could not be initialized.");
}

const SCENE_TITLES = [
  "One Year of Coffee",
  "Every dot is a coffee",
  "Five drinks, one habit",
  "It became routine",
  "I am a morning person",
  "The trend was up",
  "That one Tuesday",
  "A year, held in one cup",
];

const SCENE_DESCRIPTIONS = [
  "One thousand coffee purchases float as an organic cloud.",
  "One thousand purchases form a 40 by 25 grid. Focus the chart and use arrow keys to inspect them.",
  "The purchases gather into five labeled groups: espresso, latte, filter, cappuccino, and decaf.",
  "The purchases stack into twelve monthly bars, with a visible December vacation gap.",
  "The purchases form a twenty-four-hour clock ring whose brightness shows hourly frequency.",
  "The purchases collapse onto a fifty-two-week average line with an area fill.",
  "The weekly field dims while seven purchases from Tuesday, September 16 pulse red.",
  "All one thousand dots form a coffee cup, handle, saucer, and three strands of steam.",
];

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const overlayRenderer = new SceneOverlayRenderer();
let activeIndex = 0;
let currentScene = null;
let userPaused = false;
let systemReduced = motionPreference.matches;
let tooltipLocked = false;
let selectedGridIndex = 0;
let resizeFrame = null;
let finaleTimer = null;

function isMotionReduced() {
  return systemReduced || userPaused;
}

function createParticle(record) {
  return {
    id: record.id,
    radius: 2,
    alpha: 0,
    color: "#4a271b",
  };
}

let engine;

function queueSceneResize() {
  if (!engine || resizeFrame != null) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    activateScene(activeIndex, { immediate: true, reason: "resize" });
  });
}

engine = new ParticleEngine({
  canvas,
  particles: coffeeData.map(createParticle),
  size: canvasWrap.getBoundingClientRect(),
  observeVisibility: true,
  reducedMotion: isMotionReduced(),
  ambient: { enabled: false, amplitude: 1.8, speed: 0.00065 },
  onResize: queueSceneResize,
});
engine.addOverlay((context, frame) => overlayRenderer.render(context, frame));
engine.observeResize(canvasWrap);

function displaySceneMetadata(index) {
  const title = SCENE_TITLES[index];
  if (sceneIndex) sceneIndex.textContent = `${String(index + 1).padStart(2, "0")} / 08`;
  if (sceneTitle) sceneTitle.textContent = title;
  if (chartSummary) chartSummary.textContent = `Chapter ${index + 1} of 8. ${SCENE_DESCRIPTIONS[index]}`;
  canvas.setAttribute("aria-label", SCENE_DESCRIPTIONS[index]);
  canvas.dataset.interactive = String(index === 1);
  setFinaleVisibility(index === 7);
  drinkLegend?.classList.toggle("is-visible", index === 2);
  drinkLegend?.setAttribute("aria-hidden", String(index !== 2));
  monthCallout?.classList.toggle("is-visible", index === 3);
  monthCallout?.setAttribute("aria-hidden", String(index !== 3));
  clockReadout?.classList.toggle("is-visible", index === 4);
  clockReadout?.setAttribute("aria-hidden", String(index !== 4));
  const trendVisible = index === 5 || index === 6;
  trendReadout?.classList.toggle("is-visible", trendVisible);
  trendReadout?.classList.toggle("is-outlier", index === 6);
  trendReadout?.setAttribute("aria-hidden", String(!trendVisible));
  updateTrendReadout(index);
  if (index !== 1) hideTooltip();
}

function setFinaleVisibility(visible) {
  window.clearTimeout(finaleTimer);
  finaleTimer = null;
  if (!finaleCard) return;

  if (!visible) {
    finaleCard.classList.remove("is-visible");
    finaleCard.setAttribute("aria-hidden", "true");
    return;
  }

  const reveal = () => {
    finaleCard.classList.add("is-visible");
    finaleCard.setAttribute("aria-hidden", "false");
  };
  if (isMotionReduced()) reveal();
  else finaleTimer = window.setTimeout(reveal, 680);
}

function targetsWithMetadata(scene) {
  return scene.targets.map((target) => ({ ...target, meta: target }));
}

function activateScene(index, options = {}) {
  activeIndex = Math.min(7, Math.max(0, index));
  if (engine.width <= 0 || engine.height <= 0) return;

  currentScene = computeScene(
    SCENE_IDS[activeIndex],
    coffeeData,
    coffeeStats,
    { width: engine.width, height: engine.height },
  );

  const reduced = isMotionReduced();
  overlayRenderer.setScene(currentScene, { reducedMotion: reduced });
  engine.setAmbient({
    enabled: activeIndex === 0 && !reduced,
    amplitude: 1.7,
    speed: 0.00065,
  });
  engine.setTargets(targetsWithMetadata(currentScene), {
    duration: options.immediate || reduced ? 0 : 920,
    stagger: options.immediate || reduced ? 0 : 170,
    order: (_particle, particleIndex) => (
      activeIndex % 2 === 0 ? particleIndex / 999 : 1 - particleIndex / 999
    ),
  });

  if (activeIndex === 6 && !reduced) {
    const outlierIds = currentScene.targets
      .filter((target) => target.highlighted)
      .map((target) => target.recordId);
    engine.pulse(outlierIds, { duration: 1_100, strength: 0.92 });
  }

  displaySceneMetadata(activeIndex);
}

const scrolly = createScrollyController({
  steps,
  railItems,
  reducedMotion: isMotionReduced(),
  onStepChange: (index) => activateScene(index),
});

function setStat(name, value) {
  document.querySelectorAll(`[data-stat="${name}"]`).forEach((node) => {
    node.textContent = value;
  });
}

function titleCase(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "—";
}

function formatHour(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:00 ${suffix}`;
}

function updateTrendReadout(index) {
  if (!trendReadout) return;
  const eyebrow = trendReadout.querySelector("[data-trend-eyebrow]");
  const value = trendReadout.querySelector("[data-trend-value]");
  const detail = trendReadout.querySelector("[data-trend-detail]");

  if (index === 6) {
    eyebrow.textContent = "The outlier";
    value.textContent = "7 cups";
    detail.textContent = "Tuesday, September 16";
    return;
  }

  const comparison = buildTrendComparison(coffeeStats);
  eyebrow.textContent = "Second half vs first";
  value.textContent = `${comparison.changeRate >= 0 ? "+" : ""}${Math.round(comparison.changeRate * 100)}%`;
  detail.textContent = `${comparison.firstHalf} cups → ${comparison.secondHalf} cups`;
}

function hydrateNarrativeStats() {
  setStat("top-drink", titleCase(coffeeStats.topDrink));
  setStat("top-drink-share", `${Math.round(coffeeStats.topDrinkShare * 100)}%`);
  setStat("busiest-month", coffeeStats.busiestMonth);
  setStat("busiest-month-count", coffeeStats.busiestMonthCount.toLocaleString("en-US"));
  setStat("peak-hour", formatHour(coffeeStats.peakHour));
  setStat("morning-share", `${Math.round(coffeeStats.morningShare * 100)}%`);
  setStat("first-half", `${coffeeStats.firstHalfCups} cups`);
  setStat("second-half", `${coffeeStats.secondHalfCups} cups`);
  setStat("total-spend", new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(coffeeStats.totalSpent));
  setStat("daily-average", coffeeStats.dailyAverage.toFixed(2));

  const finaleCopy = buildFinaleSummary(coffeeStats);
  const finaleTotal = document.querySelector("[data-finale-total]");
  const finaleSummary = document.querySelector("[data-finale-summary]");
  if (finaleTotal) finaleTotal.textContent = finaleCopy.headline;
  if (finaleSummary) finaleSummary.textContent = finaleCopy.detail;

  const clockPeak = document.querySelector("[data-clock-peak]");
  const clockDetail = document.querySelector("[data-clock-detail]");
  if (clockPeak) clockPeak.textContent = formatHour(coffeeStats.peakHour);
  if (clockDetail) {
    clockDetail.textContent = `${coffeeStats.hourCounts[coffeeStats.peakHour]} cups · ${Math.round(coffeeStats.morningShare * 100)}% before noon`;
  }

  const legendList = drinkLegend?.querySelector("ol");
  if (legendList) {
    const items = buildDrinkLegendItems(coffeeStats).map(({ drink, count, share }) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      const value = document.createElement("strong");
      item.style.setProperty("--swatch", DRINK_COLORS[drink]);
      label.textContent = titleCase(drink);
      value.textContent = `${count} · ${Math.round(share * 100)}%`;
      item.append(label, value);
      return item;
    });
    legendList.replaceChildren(...items);
  }
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.hidden = true;
  tooltipLocked = false;
}

function showTooltip(index) {
  if (!tooltip || activeIndex !== 1 || index < 0 || index >= coffeeData.length) return;
  selectedGridIndex = index;
  const record = coffeeData[index];
  const particle = engine.particles[index];
  const copy = formatCoffeeTooltip(record);
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  title.textContent = copy.title;
  detail.textContent = copy.detail;
  tooltip.replaceChildren(title, detail);
  tooltip.hidden = false;

  const point = positionTooltip(
    { x: particle.x, y: particle.y },
    { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
    { width: engine.width, height: engine.height },
  );
  tooltip.style.left = `${point.x}px`;
  tooltip.style.top = `${point.y}px`;
  chartSummary.textContent = `${SCENE_DESCRIPTIONS[1]} Selected: ${copy.title}, ${copy.detail}.`;
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

canvas.addEventListener("pointermove", (event) => {
  if (activeIndex !== 1 || tooltipLocked) return;
  const point = canvasPoint(event);
  const index = findNearestParticle(engine.particles, point.x, point.y, 12);
  if (index >= 0) showTooltip(index);
  else hideTooltip();
});

canvas.addEventListener("pointerdown", (event) => {
  if (activeIndex !== 1) return;
  const point = canvasPoint(event);
  const index = findNearestParticle(engine.particles, point.x, point.y, 16);
  if (index >= 0) {
    tooltipLocked = true;
    showTooltip(index);
  }
});

canvas.addEventListener("pointerleave", () => {
  if (!tooltipLocked) hideTooltip();
});

canvas.addEventListener("keydown", (event) => {
  if (activeIndex !== 1) return;
  if (event.key === "Escape") {
    hideTooltip();
    return;
  }

  const nextIndex = gridIndexForKey(selectedGridIndex, event.key);
  if (nextIndex !== selectedGridIndex || ["Home", "End"].includes(event.key)) {
    event.preventDefault();
    tooltipLocked = true;
    showTooltip(nextIndex);
  }
});

function applyMotionPreference() {
  const reduced = isMotionReduced();
  engine.setReducedMotion(reduced);
  engine.setAmbient({ enabled: activeIndex === 0 && !reduced });
  overlayRenderer.setReducedMotion(reduced);
  scrolly.setReducedMotion(reduced);
  motionToggle?.setAttribute("aria-pressed", String(reduced));
  if (motionLabel) {
    motionLabel.textContent = systemReduced && !userPaused
      ? "Motion reduced"
      : userPaused
        ? "Resume motion"
        : "Pause motion";
  }
  activateScene(activeIndex, { immediate: reduced, reason: "motion" });
}

motionToggle?.addEventListener("click", () => {
  userPaused = !userPaused;
  applyMotionPreference();
});

const handleSystemMotion = (event) => {
  systemReduced = event.matches;
  applyMotionPreference();
};
motionPreference.addEventListener?.("change", handleSystemMotion);

hydrateNarrativeStats();
activateScene(0, { immediate: true, reason: "initial" });

window.addEventListener("pagehide", () => {
  window.clearTimeout(finaleTimer);
  scrolly.destroy();
  engine.destroy();
  motionPreference.removeEventListener?.("change", handleSystemMotion);
});
