// Seeded 2D simplex noise (same construction as day 54's mesh studio), plus a
// fractal-sum helper. Everything is derived from the permutation table, so a
// seed reproduces the exact same field on every machine.
import { mulberry32 } from "./rng.js";

function buildPermutation(seed) {
  const random = mulberry32(seed);
  const values = Array.from({ length: 256 }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return Uint8Array.from({ length: 512 }, (_, index) => values[index & 255]);
}

const GRADIENTS = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const SKEW = 0.5 * (Math.sqrt(3) - 1);
const UNSKEW = (3 - Math.sqrt(3)) / 6;

export function createSimplexNoise(seed = 63) {
  const permutation = buildPermutation(seed);

  function cornerContribution(hash, x, y) {
    const falloff = 0.5 - x * x - y * y;
    if (falloff <= 0) return 0;
    const gradient = GRADIENTS[hash & 7];
    return falloff ** 4 * (gradient[0] * x + gradient[1] * y);
  }

  /** Classic 2D simplex noise, roughly in [-1, 1]. */
  function noise2D(x, y) {
    const skewed = (x + y) * SKEW;
    const cellX = Math.floor(x + skewed);
    const cellY = Math.floor(y + skewed);
    const unskewed = (cellX + cellY) * UNSKEW;
    const localX = x - (cellX - unskewed);
    const localY = y - (cellY - unskewed);
    const stepX = localX > localY ? 1 : 0;
    const stepY = localX > localY ? 0 : 1;
    const middleX = localX - stepX + UNSKEW;
    const middleY = localY - stepY + UNSKEW;
    const farX = localX - 1 + 2 * UNSKEW;
    const farY = localY - 1 + 2 * UNSKEW;
    const wrappedX = cellX & 255;
    const wrappedY = cellY & 255;
    const first = permutation[wrappedX + permutation[wrappedY]];
    const middle = permutation[wrappedX + stepX + permutation[wrappedY + stepY]];
    const far = permutation[wrappedX + 1 + permutation[wrappedY + 1]];
    return 70 * (
      cornerContribution(first, localX, localY)
      + cornerContribution(middle, middleX, middleY)
      + cornerContribution(far, farX, farY)
    );
  }

  /** Fractal Brownian motion: `octaves` layers of noise2D, normalised to [-1, 1]. */
  function fbm2D(x, y, octaves = 3, lacunarity = 2, gain = 0.5) {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i += 1) {
      sum += amplitude * noise2D(x * frequency, y * frequency);
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / norm;
  }

  return { noise2D, fbm2D };
}
