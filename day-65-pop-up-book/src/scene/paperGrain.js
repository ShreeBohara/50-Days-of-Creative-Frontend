// A tileable normal map of paper tooth: fibres running mostly one way plus a
// fine felt, so a raking lamp picks out the stock without any texture on it.

import * as THREE from 'three'
import { hash2, noise2 } from '../art/rng.js'

let cached = null

export function paperGrain(size = 256) {
  if (cached) return cached
  const h = new Float32Array(size * size)
  const P = 16 // noise period in cells, so the tile wraps
  const wrapNoise = (x, y, seed) => {
    // bilinear blend of four shifted copies keeps it seamless
    const u = x / size
    const v = y / size
    const a = noise2(u * P, v * P, seed)
    const b = noise2((u - 1) * P, v * P, seed)
    const c = noise2(u * P, (v - 1) * P, seed)
    const d = noise2((u - 1) * P, (v - 1) * P, seed)
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const felt = wrapNoise(x, y, 3) * 0.6 + wrapNoise(x * 2 % size, y * 2 % size, 9) * 0.3
      // fibres: stretched along x
      const fib = wrapNoise(x * 0.25 % size, y * 4 % size, 21) * 0.5
      h[y * size + x] = felt + fib + hash2(x, y, 5) * 0.12
    }
  }
  const data = new Uint8Array(size * size * 4)
  const k = 2.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = (xx, yy) => h[((yy + size) % size) * size + ((xx + size) % size)]
      const dx = (at(x + 1, y) - at(x - 1, y)) * k
      const dy = (at(x, y + 1) - at(x, y - 1)) * k
      const l = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = ((-dx / l) * 0.5 + 0.5) * 255
      data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  cached = tex
  return tex
}
