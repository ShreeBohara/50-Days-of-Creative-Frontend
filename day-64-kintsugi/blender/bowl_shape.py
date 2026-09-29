"""The chawan: wheel-thrown profile, hand-made deformations, UVs, glaze textures.

Geometry is a lathe of one closed cross-section (inner well → rim → outer wall
→ foot ring → base underside), so the solid is watertight by construction.
UVs are the lathe parameters: u = angle, v = arclength along the section. The
glaze is synthesised directly in that UV space from each texel's 3D position,
so procedural noise is continuous across the u seam (placed at the back).

Blender axes: Z up, the web camera looks from -Y ("front").
"""

import math
import os

import numpy as np
from mathutils import Vector, noise

from noise_np import Noise, hex_rgb, mix, smoothstep

N_SEG = 120                    # angular segments
THETA0 = math.pi / 2           # u = 0 at +Y (the back) so the UV seam hides
FRONT = -math.pi / 2           # -Y faces the web camera
DENT_THETA = FRONT + math.radians(40)  # thumb dent, 40° right of front

# Cross-section control points (r, z) in metres. Outer Ø ≈ 12.2 cm, H ≈ 8.6 cm.
INNER_CP = [
    (0.0000, 0.0160), (0.0120, 0.0166), (0.0260, 0.0190), (0.0380, 0.0248),
    (0.0474, 0.0340), (0.0532, 0.0462), (0.0556, 0.0600), (0.0560, 0.0735),
    (0.0552, 0.0834),
]
OUTER_CP = [
    (0.0602, 0.0834), (0.0612, 0.0740), (0.0607, 0.0598), (0.0583, 0.0450),
    (0.0525, 0.0305), (0.0425, 0.0186), (0.0312, 0.0116), (0.0268, 0.0093),
]
FOOT_CP = [
    (0.0268, 0.0093), (0.0263, 0.0022), (0.0255, 0.0003), (0.0247, 0.0000),
    (0.0219, 0.0000), (0.0211, 0.0004), (0.0205, 0.0014), (0.0202, 0.0058),
    (0.0180, 0.0063), (0.0120, 0.0069), (0.0060, 0.0073), (0.0000, 0.0074),
]
N_INNER, N_RIM, N_OUTER = 34, 9, 34


# ------------------------------------------------------------------ profile

def _catmull_rom(pts, n_per=32):
    p = np.array(pts, dtype=np.float64)
    p = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n_per, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(p[-2])
    return np.array(out)


def _resample(poly, n):
    seg = np.linalg.norm(np.diff(poly, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, poly[:, 0]), np.interp(t, s, poly[:, 1])], 1)


def _subdivide(poly, max_len=0.0022):
    out = [poly[0]]
    for a, b in zip(poly[:-1], poly[1:]):
        k = max(1, int(math.ceil(np.linalg.norm(b - a) / max_len)))
        for j in range(1, k + 1):
            out.append(a + (b - a) * j / k)
    return np.array(out)


def profile():
    """Closed section from inner axis point to base axis point.

    Returns (P (K,2), V (K,) normalised arclength, region (K,) str, bounds dict).
    """
    inner = _resample(_catmull_rom(INNER_CP), N_INNER)
    ri, zr = inner[-1]
    outer = _resample(_catmull_rom(OUTER_CP), N_OUTER)
    ro = outer[0][0]
    c = np.array([(ri + ro) / 2, zr])
    rad = (ro - ri) / 2
    arc = np.array([c + rad * np.array([math.cos(a), math.sin(a)])
                    for a in np.linspace(math.pi, 0, N_RIM + 2)[1:-1]])
    foot = _subdivide(np.array(FOOT_CP))[1:]  # first point == outer[-1]

    parts = [(inner, 'inner'), (arc, 'rim'), (outer, 'outer'), (foot, 'foot')]
    P = np.vstack([p for p, _ in parts])
    region = sum([[name] * len(p) for p, name in parts], [])
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    V = s / s[-1]
    i0 = len(inner)
    i1 = i0 + len(arc)
    i2 = i1 + len(outer)
    bounds = {
        'v_rim0': float((V[i0 - 1] + V[i0]) / 2),
        'v_rim1': float((V[i1 - 1] + V[i1]) / 2),
        'v_outer1': float(V[i2 - 1]),
        'length': float(s[-1]),
    }
    return P, V, np.array(region), bounds


# ------------------------------------------------------------ deformation

def _wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def deform(r, z, th):
    """Hand-made character: throwing wobble, slight oval, thumb dent, uneven rim.

    The same radial offset applies to inner and outer surfaces, so the wall
    keeps its thickness (a real dent, not a dimple).
    """
    ww = float(smoothstep(0.014, 0.032, r))
    n1 = noise.noise(Vector((math.cos(th) * 1.3, math.sin(th) * 1.3, z * 22.0)))
    dr = ww * (0.0008 * n1 + 0.0005 * math.cos(2 * (th - 0.6)))
    arc = _wrap(th - DENT_THETA) * 0.058
    g = math.exp(-(arc * arc) / (2 * 0.011 ** 2) - ((z - 0.050) ** 2) / (2 * 0.012 ** 2))
    dr -= 0.0024 * g * ww
    wr = float(smoothstep(0.050, 0.083, z))
    n2 = noise.noise(Vector((math.cos(th) * 2.1 + 5.0, math.sin(th) * 2.1, 0.3)))
    dz = wr * (0.0010 * math.sin(2 * th + 0.9) + 0.0008 * n2)
    return r + dr, z + dz


# ------------------------------------------------------------------- mesh

def build_mesh_data():
    """Lathe the section. Returns verts, faces, per-face-loop uvs, meta."""
    P, V, region, bounds = profile()
    K = len(P)
    verts = []
    # poles first: inner-axis (k=0) and base-axis (k=K-1)
    for k in (0, K - 1):
        r, z = deform(0.0, P[k][1], 0.0)
        verts.append((0.0, 0.0, z))
    ring = {}
    for k in range(1, K - 1):
        for i in range(N_SEG):
            th = THETA0 + 2 * math.pi * i / N_SEG
            r, z = deform(P[k][0], P[k][1], th)
            ring[(k, i)] = len(verts)
            verts.append((r * math.cos(th), r * math.sin(th), z))

    faces, uvs = [], []

    def u_of(i, wrap_hi):
        return 1.0 if (i == 0 and wrap_hi) else i / N_SEG

    for k in range(1, K - 2):
        for i in range(N_SEG):
            j = (i + 1) % N_SEG
            faces.append((ring[(k, i)], ring[(k + 1, i)], ring[(k + 1, j)], ring[(k, j)]))
            uvs.append([(u_of(i, False), V[k]), (u_of(i, False), V[k + 1]),
                        (u_of(j, True), V[k + 1]), (u_of(j, True), V[k])])
    for i in range(N_SEG):
        j = (i + 1) % N_SEG
        um = (i + 0.5) / N_SEG
        faces.append((0, ring[(1, i)], ring[(1, j)]))
        uvs.append([(um, V[0]), (u_of(i, False), V[1]), (u_of(j, True), V[1])])
        faces.append((1, ring[(K - 2, j)], ring[(K - 2, i)]))
        uvs.append([(um, V[K - 1]), (u_of(j, True), V[K - 2]), (u_of(i, False), V[K - 2])])

    return verts, faces, uvs, {'P': P, 'V': V, 'region': region, 'bounds': bounds}


def build_object(name='chawan', collection=None):
    import bmesh
    import lib_common as C

    verts, faces, uvs, meta = build_mesh_data()
    obj = C.mesh_object(name, verts, faces, uvs, collection)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    C.smooth_by_angle(obj, 38.0)
    return obj, meta


# --------------------------------------------------------------- textures

def synth_textures(meta, out_dir, size=2048, seal_path=None, seed=64):
    """Shino glaze: albedo (sRGB), roughness (G), tangent normal.

    Row 0 of every array is v = 0 (Blender images are bottom-up).
    """
    P, V, bounds = meta['P'], meta['V'], meta['bounds']
    W = H = size
    nz = Noise(seed)
    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H
    th_row = THETA0 + 2 * math.pi * u
    r_col = np.interp(v, V, P[:, 0])
    z_col = np.interp(v, V, P[:, 1])

    alb = np.zeros((H, W, 3), dtype=np.float32)
    rough = np.zeros((H, W), dtype=np.float32)
    height = np.zeros((H, W), dtype=np.float32)

    seal = None
    if seal_path and os.path.exists(seal_path):
        import bpy
        img = bpy.data.images.load(seal_path)
        sw, sh = img.size
        px = np.empty(sw * sh * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        seal = px.reshape(sh, sw, 4)[:, :, 0]

    SHINO = hex_rgb('#efe6da')
    SHINO_HI = hex_rgb('#f7f1e8')
    SHINO_GREY = hex_rgb('#e0d5c5')
    POOL = hex_rgb('#d6d1c6')
    FIRE_LO = hex_rgb('#ecc3a2')
    FIRE = hex_rgb('#d98c5f')
    FIRE_HI = hex_rgb('#bf6841')
    CLAY = hex_rgb('#b88a63')
    CLAY_DARK = hex_rgb('#8f5f3f')
    IRON = hex_rgb('#4a2f22')
    HOLE = hex_rgb('#a26e4b')

    # drips of glaze running below the glaze line (angle, length)
    drip_rng = np.random.RandomState(seed + 7)
    drips = [(drip_rng.uniform(0, 2 * math.pi), drip_rng.uniform(0.002, 0.0055),
              drip_rng.uniform(0.004, 0.008)) for _ in range(9)]

    CH = 128
    for r0 in range(0, H, CH):
        rows = slice(r0, min(H, r0 + CH))
        vv = v[rows]
        th = np.broadcast_to(th_row[None, :], (len(vv), W)).ravel()
        vr = np.repeat(vv, W)
        r = np.repeat(r_col[rows], W)
        z = np.repeat(z_col[rows], W)
        x = r * np.cos(th)
        y = r * np.sin(th)

        inner = vr < bounds['v_rim0']
        rim = (vr >= bounds['v_rim0']) & (vr < bounds['v_rim1'])
        outer = (vr >= bounds['v_rim1']) & (vr <= bounds['v_outer1'])

        # -- where the glaze stops on the outside (wavy line + drips)
        zg = 0.0195 + 0.0035 * nz.fbm(np.cos(th) * 1.6, np.sin(th) * 1.6, np.full_like(th, 0.5), 3)
        for (ta, ln, wd) in drips:
            d = np.angle(np.exp(1j * (th - ta))) * r
            zg -= ln * np.exp(-(d / wd) ** 2)
        above = z - zg
        glaze_soft = np.where(inner | rim, 1.0, np.where(outer, smoothstep(-0.0004, 0.0004, above), 0.0))

        # -- crawling: a few irregular bare islands where the glaze pulled back
        # near the glaze line (rounded blobs, not a crackle grid — the only
        # cracks on this bowl should be the ones the visitor makes).
        band = np.where(outer, 1.0 - smoothstep(0.003, 0.012, above), 0.0)
        blob = nz.fbm(x / 0.0055, y / 0.0055, z / 0.0055, 3)
        crawl = smoothstep(0.30, 0.38, blob) * band
        glaze = np.clip(glaze_soft - crawl, 0.0, 1.0)

        # -- glaze colour: shino body with mottling
        m_large = nz.fbm(x / 0.035, y / 0.035, z / 0.035, 3)
        m_mid = nz.fbm(x / 0.009, y / 0.009, z / 0.009, 4)
        col = mix(np.broadcast_to(SHINO, (len(x), 3)), SHINO_HI, np.clip(m_mid * 0.9, 0, 1))
        col = mix(col, SHINO_GREY, np.clip(-m_mid * 0.8, 0, 1))
        pool = np.where(inner, 1.0 - smoothstep(0.017, 0.036, z), 0.0)
        col = mix(col, POOL, pool * 0.55)

        # -- hi-iro: orange fire colour where the glaze runs thin
        rim_thin = np.where(rim, 1.0, np.where(inner | outer, smoothstep(0.070, 0.086, z), 0.0))
        line_thin = np.where(outer, 1.0 - smoothstep(0.0, 0.013, above), 0.0)
        blush = smoothstep(0.18, 0.55, m_large) * np.where(outer, 0.55, 0.25)
        fire = np.clip((rim_thin * 0.85 + line_thin * 0.9) * (0.45 + 0.8 * smoothstep(-0.3, 0.5, m_large)) + blush, 0, 1)
        fire *= 1.0 - pool
        col = mix(col, FIRE_LO, smoothstep(0.05, 0.40, fire))
        col = mix(col, FIRE, smoothstep(0.35, 0.80, fire))
        col = mix(col, FIRE_HI, smoothstep(0.80, 1.00, fire) * 0.8)

        # -- pinholes (yuzu-hada pitting)
        f1p, _, cid = nz.worley(x / 0.0017, y / 0.0017, z / 0.0017)
        dens = np.where(outer, 0.34, 0.20)
        rr = 0.09 + 0.16 * (cid / np.maximum(dens, 1e-3))
        ph = np.where(cid < dens, 1.0 - smoothstep(rr * 0.55, rr, f1p), 0.0) * glaze
        col = mix(col, HOLE, ph * 0.75)

        # -- clay where unglazed (foot, below the line, crawl gaps)
        c_var = nz.fbm(x / 0.006, y / 0.006, z / 0.006, 3)
        clay = mix(np.broadcast_to(CLAY, (len(x), 3)), CLAY_DARK,
                   np.clip(0.35 + 0.5 * c_var + 0.5 * (1 - smoothstep(0.0, 0.012, z)), 0, 1) * 0.8)
        f1i, _, cidi = nz.worley(x / 0.0011, y / 0.0011, z / 0.0011)
        iron = np.where(cidi < 0.22, 1.0 - smoothstep(0.06, 0.13, f1i), 0.0)
        clay = mix(clay, IRON, iron * 0.85)
        # flashing: glaze-adjacent clay toasts orange
        clay = mix(clay, FIRE_HI, (1.0 - smoothstep(0.0, 0.004, -above)) * np.where(outer, 0.45, 0.0))

        # -- seal stamped into the base underside
        sealm = np.zeros_like(x)
        foot_base = (vr > bounds['v_outer1']) & (r < 0.0185)
        if seal is not None:
            S = 0.0072  # seal radius in metres
            su = np.clip((x / S) * 0.5 + 0.5, 0, 1)
            sv = np.clip((-y / S) * 0.5 + 0.5, 0, 1)
            inside = foot_base & (np.abs(x) < S) & (np.abs(y) < S)
            sh_, sw_ = seal.shape
            samp = seal[(sv * (sh_ - 1)).astype(int), (su * (sw_ - 1)).astype(int)]
            sealm = np.where(inside, samp, 0.0)
            clay = mix(clay, CLAY_DARK * 0.85, sealm * 0.6)

        colour = mix(clay, col, glaze)

        # -- roughness
        rg = 0.30 + 0.07 * nz.fbm(x / 0.004, y / 0.004, z / 0.004, 2) - 0.09 * pool + 0.12 * fire + 0.35 * ph
        rc = 0.84 + 0.08 * c_var
        rgh = rc * (1 - glaze) + rg * glaze

        # -- height (metres)
        # throwing lines: faint, uneven spacing and strength — felt more than seen
        wall = np.where(inner | outer, smoothstep(0.024, 0.036, z) * (1.0 - smoothstep(0.066, 0.078, z)), 0.0)
        ring_amp = 0.000038 * smoothstep(-0.35, 0.35, nz.fbm(x / 0.018, y / 0.018, z / 0.018, 2))
        ring_ph = 2 * math.pi * z / 0.0068 + 3.2 * nz.fbm(x / 0.025, y / 0.025, z / 0.012, 2)
        rings = ring_amp * np.sin(ring_ph) * wall
        peel = 0.000022 * nz.fbm(x / 0.0011, y / 0.0011, z / 0.0011, 2) * glaze
        grit = 0.000045 * nz.fbm(x / 0.0007, y / 0.0007, z / 0.0007, 2) * (1 - glaze)
        hgt = rings + peel + grit + 0.00016 * glaze - 0.00013 * ph - 0.00032 * sealm

        n = len(vv)
        alb[rows] = colour.reshape(n, W, 3)
        rough[rows] = rgh.reshape(n, W)
        height[rows] = hgt.reshape(n, W)

    # -- normals from height (u periodic, v clamped)
    r_safe = np.maximum(r_col, 0.004)[:, None]
    du = r_safe * 2 * math.pi / W
    dv = bounds['length'] / H
    dhdu = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / (2 * du)
    dhdv = np.gradient(height, axis=0) / dv
    nrm = np.stack([-dhdu, -dhdv, np.ones_like(height)], axis=2)
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    nmap = nrm * 0.5 + 0.5

    import lib_common as C
    paths = {
        'albedo': os.path.join(out_dir, 'bowl_albedo.png'),
        'rough': os.path.join(out_dir, 'bowl_rough.png'),
        'normal': os.path.join(out_dir, 'bowl_normal.png'),
    }
    C.save_image('bowl_albedo', alb, paths['albedo'], 'sRGB')
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], axis=2)
    C.save_image('bowl_rough', orm, paths['rough'], 'Non-Color')
    C.save_image('bowl_normal', nmap, paths['normal'], 'Non-Color')
    return paths
