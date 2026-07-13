import { PALETTES, applyPalette } from "./palettes.js";

function randomBetween(random, minimum, maximum) {
  return minimum + random() * (maximum - minimum);
}

function randomSeed(random) {
  return randomBetween(random, 0, 1000);
}

export function chooseDifferentPalette(currentId, random = Math.random) {
  const choices = PALETTES.filter((palette) => palette.id !== currentId);
  return choices[Math.floor(random() * choices.length)] || PALETTES[0];
}

export function randomizeScene(scene, random = Math.random) {
  const palette = chooseDifferentPalette(scene.presetId, random);
  applyPalette(scene, palette.id);
  scene.points.forEach((point) => {
    point.x = randomBetween(random, 0.12, 0.88);
    point.y = randomBetween(random, 0.12, 0.88);
    point.radius = randomBetween(random, 0.5, 0.64);
    point.seedX = randomSeed(random);
    point.seedY = randomSeed(random);
    point.phase = randomBetween(random, 0, Math.PI * 2);
  });
  return palette;
}

export function shuffleSceneMotion(scene, framePoints, random = Math.random) {
  scene.points.forEach((point, index) => {
    const visiblePoint = framePoints[index] || point;
    point.x = visiblePoint.x;
    point.y = visiblePoint.y;
    point.radius = visiblePoint.radius;
    point.seedX = randomSeed(random);
    point.seedY = randomSeed(random);
    point.phase = randomBetween(random, 0, Math.PI * 2);
  });
}
