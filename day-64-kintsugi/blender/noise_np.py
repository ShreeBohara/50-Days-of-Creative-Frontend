"""Vectorised, seeded 3D noise for texture synthesis (numpy only).

Blender bundles numpy, so textures are synthesised directly in UV space from
the analytic surface position of every texel. That keeps the glaze exactly
reproducible (fixed seeds, no Cycles bake noise) and fast (~seconds).

All functions take flat float arrays x, y, z of equal length.
"""

import numpy as np

_GRAD3 = np.array(
    [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
        [1, 1, 0], [0, -1, 1], [-1, 1, 0], [0, -1, -1],
    ],
    dtype=np.float64,
)


class Noise:
    """Seeded Perlin gradient noise + Worley cellular noise."""

    def __init__(self, seed):
        rng = np.random.RandomState(seed)
        perm = rng.permutation(256)
        self.p = np.concatenate([perm, perm]).astype(np.int64)
        # per-lattice-cell jitter for Worley feature points
        self.jit = rng.random_sample((256, 3))
        self.rnd = rng.random_sample(256)

    # ---------------------------------------------------------------- perlin
    def _hash(self, xi, yi, zi):
        p = self.p
        return p[p[p[xi & 255] + (yi & 255)] + (zi & 255)]

    def perlin(self, x, y, z):
        xf = np.floor(x)
        yf = np.floor(y)
        zf = np.floor(z)
        xi = xf.astype(np.int64)
        yi = yf.astype(np.int64)
        zi = zf.astype(np.int64)
        x = x - xf
        y = y - yf
        z = z - zf
        u = x * x * x * (x * (x * 6 - 15) + 10)
        v = y * y * y * (y * (y * 6 - 15) + 10)
        w = z * z * z * (z * (z * 6 - 15) + 10)

        def g(dx, dy, dz):
            h = self._hash(xi + dx, yi + dy, zi + dz) & 15
            gv = _GRAD3[h]
            return gv[:, 0] * (x - dx) + gv[:, 1] * (y - dy) + gv[:, 2] * (z - dz)

        x00 = g(0, 0, 0) + u * (g(1, 0, 0) - g(0, 0, 0))
        x10 = g(0, 1, 0) + u * (g(1, 1, 0) - g(0, 1, 0))
        x01 = g(0, 0, 1) + u * (g(1, 0, 1) - g(0, 0, 1))
        x11 = g(0, 1, 1) + u * (g(1, 1, 1) - g(0, 1, 1))
        y0 = x00 + v * (x10 - x00)
        y1 = x01 + v * (x11 - x01)
        return (y0 + w * (y1 - y0)) * 1.1  # ≈ [-1, 1]

    def fbm(self, x, y, z, octaves=4, lacunarity=2.03, gain=0.5):
        total = np.zeros_like(x)
        amp = 1.0
        norm = 0.0
        f = 1.0
        for o in range(octaves):
            # offset each octave so the lattices don't align
            total += amp * self.perlin(x * f + o * 17.3, y * f - o * 9.1, z * f + o * 5.7)
            norm += amp
            amp *= gain
            f *= lacunarity
        return total / norm

    # ---------------------------------------------------------------- worley
    def worley(self, x, y, z):
        """Returns (F1, F2, cell_random) with unit cell size."""
        xf = np.floor(x).astype(np.int64)
        yf = np.floor(y).astype(np.int64)
        zf = np.floor(z).astype(np.int64)
        f1 = np.full(x.shape, 9.0)
        f2 = np.full(x.shape, 9.0)
        cid = np.zeros(x.shape, dtype=np.float64)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    cx = xf + dx
                    cy = yf + dy
                    cz = zf + dz
                    h = self._hash(cx, cy, cz)
                    j = self.jit[h]
                    px = cx + j[:, 0]
                    py = cy + j[:, 1]
                    pz = cz + j[:, 2]
                    d = np.sqrt((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2)
                    closer = d < f1
                    f2 = np.where(closer, f1, np.minimum(f2, d))
                    cid = np.where(closer, self.rnd[h], cid)
                    f1 = np.where(closer, d, f1)
        return f1, f2, cid


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def hex_rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def mix(a, b, t):
    """Mix colour arrays (N,3) or (3,) by weight t (N,)."""
    t = t[:, None] if np.ndim(t) == 1 else t
    return a * (1.0 - t) + b * t
