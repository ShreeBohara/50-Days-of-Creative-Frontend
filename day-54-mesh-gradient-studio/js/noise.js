function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

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
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function createSimplexNoise(seed = 54) {
  const permutation = buildPermutation(seed);
  const skew = 0.5 * (Math.sqrt(3) - 1);
  const unskew = (3 - Math.sqrt(3)) / 6;

  function cornerContribution(hash, x, y) {
    const falloff = 0.5 - x * x - y * y;
    if (falloff <= 0) return 0;
    const gradient = GRADIENTS[hash & 7];
    return falloff ** 4 * (gradient[0] * x + gradient[1] * y);
  }

  function noise2D(x, y) {
    const skewed = (x + y) * skew;
    const cellX = Math.floor(x + skewed);
    const cellY = Math.floor(y + skewed);
    const unskewed = (cellX + cellY) * unskew;
    const localX = x - (cellX - unskewed);
    const localY = y - (cellY - unskewed);
    const stepX = localX > localY ? 1 : 0;
    const stepY = localX > localY ? 0 : 1;
    const middleX = localX - stepX + unskew;
    const middleY = localY - stepY + unskew;
    const farX = localX - 1 + 2 * unskew;
    const farY = localY - 1 + 2 * unskew;
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

  return { noise2D };
}
