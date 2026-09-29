"""Tray, tools and the shoji gobo → public/models/tray_tools.glb, public/textures/shoji_gobo.png

    blender -b --factory-startup -P blender/build_tray_tools.py -- [--preview]

- Hinoki tray (42 × 30 cm) stained kaki-shibu: a rolled rim swept along a
  rounded rectangle, a barely concave dish, wood grain + wear synthesised in
  numpy into top-down UVs.
- Fude brush (bamboo handle with nodes, urushi ferrule with a gold band, tuft
  with a separate `brush_tip` empty for the painting point).
- Powder jar (black urushi, gold rim) with a separate hinged lid.
- Agate burnisher (turned handle, amber stone).
- Placement empties (slot_bowl, slot_brush, slot_jar, slot_burnisher).
"""

import math
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import lib_common as C  # noqa: E402
from noise_np import Noise, hex_rgb, mix, smoothstep  # noqa: E402

TRAY_W, TRAY_D = 0.42, 0.30
CORNER_R = 0.035
RIM_H = 0.012
BASE_Z = -0.010


# ------------------------------------------------------------------- tray

def rounded_rect_path(w, d, r, n_x=40, n_y=28, n_a=10):
    """Points + outward normals around a rounded rectangle, with a FIXED number
    of samples per straight side and per corner, so rings of different insets
    line up vertex-for-vertex (clean quads between them)."""
    hx, hy = w / 2 - r, d / 2 - r
    pts, nrm = [], []

    def line(a, b, nn, k):
        for i in range(k):
            t = i / k
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            nrm.append(nn)

    def arc(c, a0, k):
        for i in range(k):
            a = a0 + (math.pi / 2) * i / k
            pts.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
            nrm.append((math.cos(a), math.sin(a)))

    line((hx + r, -hy), (hx + r, hy), (1, 0), n_y)
    arc((hx, hy), 0.0, n_a)
    line((hx, hy + r), (-hx, hy + r), (0, 1), n_x)
    arc((-hx, hy), math.pi / 2, n_a)
    line((-hx - r, hy), (-hx - r, -hy), (-1, 0), n_y)
    arc((-hx, -hy), math.pi, n_a)
    line((-hx, -hy - r), (hx, -hy - r), (0, -1), n_x)
    arc((hx, -hy), 1.5 * math.pi, n_a)
    return np.array(pts), np.array(nrm)


def ring_at(inset):
    """The rounded rectangle `inset` metres inside the outer edge; the corner
    radius shrinks with the inset (never below 4 mm) instead of folding over."""
    rr = max(CORNER_R - inset, 0.004)
    w = TRAY_W - 2 * inset
    d = TRAY_D - 2 * inset
    return rounded_rect_path(w, d, rr)


def tray_section():
    """(inset from outer edge, height) from the outer base edge, over the rolled
    rim, down into the dish. Returns list of (d, z)."""
    pts = [(0.0, BASE_Z), (0.0, RIM_H - 0.004)]
    # rolled lip: quarter-ish circle up and over, then down the inner face
    c = (0.004, RIM_H - 0.004)
    for a in np.linspace(math.pi, math.pi / 2, 5)[1:]:
        pts.append((c[0] + 0.004 * math.cos(a), c[1] + 0.004 * math.sin(a)))
    c2 = (0.010, RIM_H - 0.004)
    for a in np.linspace(math.pi / 2, 0.0, 5)[1:]:
        pts.append((c2[0] + 0.004 * math.cos(a) * 1.5 - 0.002, c2[1] + 0.004 * math.sin(a)))
    pts += [(0.0155, 0.0030), (0.0172, 0.0010), (0.0200, 0.0002)]
    # the dish: dips 1.5 mm toward the centre, gently
    for d in (0.030, 0.045, 0.065, 0.090, 0.112, 0.130, 0.140):
        pts.append((d, -0.0015 * smoothstep(0.02, 0.12, d)))
    return pts


def build_tray():
    sec = tray_section()
    verts, faces = [], []
    rings = []
    for (d, z) in sec:
        path, _ = ring_at(d)
        n = len(path)
        ring = []
        for k in range(n):
            ring.append(len(verts))
            verts.append((float(path[k][0]), float(path[k][1]), float(z)))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(n):
            j = (k + 1) % n
            faces.append((a[k], a[j], b[j], b[k]))
    # close the innermost ring (a very thin rectangle) with a fan to its centroid
    inner = rings[-1]
    cz = sec[-1][1]
    ci = len(verts)
    verts.append((0.0, 0.0, cz))
    for k in range(n):
        faces.append((inner[k], inner[(k + 1) % n], ci))
    # bottom: fan under the outer base ring
    outer = rings[0]
    bi = len(verts)
    verts.append((0.0, 0.0, BASE_Z))
    for k in range(n):
        faces.append((outer[(k + 1) % n], outer[k], bi))
    uvs = []
    for f in faces:
        uvs.append([(verts[i][0] / TRAY_W + 0.5, verts[i][1] / TRAY_W + 0.5) for i in f])
    obj = C.mesh_object('tray', verts, faces, uvs)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    C.smooth_by_angle(obj, 50.0)
    return obj


def tray_textures(size=2048, seed=11):
    """Top-down hinoki grain, kaki-shibu stain, worn rim, AO toward the lip."""
    W = H = size
    nz = Noise(seed)
    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H
    X, Y = np.meshgrid((u - 0.5) * TRAY_W, (v - 0.5) * TRAY_W)
    x, y = X.ravel(), Y.ravel()
    z0 = np.zeros_like(x)
    # distance to the rounded-rect edge (negative inside)
    hx, hy = TRAY_W / 2 - CORNER_R, TRAY_D / 2 - CORNER_R
    qx, qy = np.abs(x) - hx, np.abs(y) - hy
    sd = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - CORNER_R
    inset = -sd

    # flat-sawn hinoki: soft growth rings with uneven spacing, long pores, and
    # a broad figure — kept low-contrast under the persimmon-tannin stain
    warp = nz.fbm(x / 0.11, y / 0.06, z0, 3) * 0.014 + nz.fbm(x / 0.035, y / 0.02, z0 + 3, 2) * 0.0025
    phase = (y + warp) / 0.0072 + 1.4 * nz.fbm(x / 0.25, y / 0.04, z0 + 9, 2)
    growth = 0.5 + 0.5 * np.sin(2 * math.pi * phase)
    late = smoothstep(0.62, 0.98, growth) * (0.55 + 0.45 * smoothstep(-0.3, 0.4, nz.fbm(x / 0.06, y / 0.03, z0 + 13, 2)))
    pores = smoothstep(0.40, 0.80, nz.fbm(x / 0.024, y / 0.0007, z0 + 7, 2))
    figure = nz.fbm(x / 0.07, y / 0.025, z0 + 11, 3)

    CORE = hex_rgb('#3a291d')
    EDGE = hex_rgb('#6b4a33')
    LATE = hex_rgb('#2a1c13')
    HI = hex_rgb('#4a3526')
    col = mix(np.broadcast_to(CORE, (len(x), 3)), HI, np.clip(figure * 0.7 + 0.35, 0, 1) * 0.7)
    col = mix(col, LATE, late * 0.38)
    col = mix(col, LATE, pores * 0.18)
    # the rim is handled most: worn lighter on its crown
    wear = smoothstep(0.0, 0.004, inset) * (1 - smoothstep(0.010, 0.016, inset))
    wear *= 0.55 + 0.45 * smoothstep(-0.2, 0.4, nz.fbm(x / 0.012, y / 0.012, z0 + 5, 2))
    col = mix(col, EDGE, wear * 0.85)
    # AO where the dish meets the lip, and faintly toward the corners
    ao = 1 - 0.28 * (smoothstep(0.013, 0.017, inset) * (1 - smoothstep(0.017, 0.034, inset)))
    col = col * ao[:, None]

    rough = 0.52 + 0.10 * pores - 0.12 * wear + 0.05 * figure
    hgt = -0.00006 * late - 0.00004 * pores
    alb = col.reshape(H, W, 3)
    rgh = rough.reshape(H, W)
    hgt = hgt.reshape(H, W)
    texel = TRAY_W / W
    dhdx = np.gradient(hgt, axis=1) / texel
    dhdy = np.gradient(hgt, axis=0) / texel
    nrm = np.stack([-dhdx, -dhdy, np.ones_like(hgt)], axis=2)
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    paths = {k: os.path.join(C.TEX_SRC, f'tray_{k}.png') for k in ('albedo', 'rough', 'normal')}
    C.save_image('tray_albedo', alb, paths['albedo'], 'sRGB')
    C.save_image('tray_rough', np.stack([np.ones_like(rgh), rgh, np.zeros_like(rgh)], 2), paths['rough'], 'Non-Color')
    C.save_image('tray_normal', nrm * 0.5 + 0.5, paths['normal'], 'Non-Color')
    return paths


# ------------------------------------------------------------------ tools

def lathe(name, prof, seg=40, mat=None, cap_top=True):
    """Revolve (r, z) points around Z. First/last point may sit on the axis."""
    verts, faces = [], []
    rings = []
    for (r, z) in prof:
        if r < 1e-7:
            rings.append([len(verts)])
            verts.append((0.0, 0.0, z))
            continue
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ring.append(len(verts))
            verts.append((r * math.cos(a), r * math.sin(a), z))
        rings.append(ring)
    for A, Bn in zip(rings[:-1], rings[1:]):
        if len(A) == 1 and len(Bn) == 1:
            continue
        if len(A) == 1:
            for i in range(seg):
                faces.append((A[0], Bn[i], Bn[(i + 1) % seg]))
        elif len(Bn) == 1:
            for i in range(seg):
                faces.append((A[i], Bn[0], A[(i + 1) % seg]))
        else:
            for i in range(seg):
                j = (i + 1) % seg
                faces.append((A[i], Bn[i], Bn[j], A[j]))
    obj = C.mesh_object(name, verts, faces)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    if mat:
        obj.data.materials.append(mat)
    C.smooth_by_angle(obj, 40.0)
    return obj


def assign_by_z(obj, mats, bands):
    """bands: list of (z_min, z_max, mat_index); faces take the band of their centre."""
    me = obj.data
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        z = p.center.z
        for z0, z1, mi in bands:
            if z0 <= z < z1:
                p.material_index = mi
                break


def build_brush(mats):
    # lying along its own +Z; rotated flat onto the tray afterwards
    prof = [(0.0, 0.0)]
    L = 0.098
    for k in range(0, 31):
        z = 0.004 + (L - 0.004) * k / 30
        r = 0.0034 - 0.0004 * (k / 30)
        prof.append((r, z))
    # bamboo nodes: small raised rings
    out = []
    for (r, z) in prof:
        bump = 0.00035 * sum(math.exp(-((z - zn) / 0.0012) ** 2) for zn in (0.032, 0.071))
        out.append((r + bump if r > 0 else r, z))
    handle = out + [(0.0036, L + 0.001), (0.0040, L + 0.003), (0.0040, L + 0.014), (0.0036, L + 0.016)]
    tuft = [(0.0033, L + 0.017), (0.0036, L + 0.024), (0.0030, L + 0.032), (0.0018, L + 0.038), (0.0006, L + 0.042), (0.0, L + 0.0435)]
    obj = lathe('brush', handle + tuft, seg=28)
    # materials: bamboo, urushi ferrule, gold band, hair, wet red tip
    assign_by_z(obj, [mats['bamboo'], mats['urushi'], mats['gold'], mats['hair'], mats['wet']], [
        (-1, L, 0), (L, L + 0.0045, 2), (L + 0.0045, L + 0.0165, 1), (L + 0.0165, L + 0.036, 3), (L + 0.036, 1, 4),
    ])
    tip = C.link(bpy.data.objects.new('brush_tip', None))
    tip.parent = obj
    tip.location = (0, 0, L + 0.0435)
    obj.rotation_euler = (math.radians(90), 0, math.radians(112))  # handle left, tuft right
    return obj


def build_jar(mats):
    body = lathe('jar', [(0.0, 0.0), (0.017, 0.0), (0.0195, 0.002), (0.0205, 0.012), (0.0200, 0.022),
                         (0.0185, 0.0265), (0.0180, 0.028), (0.0170, 0.028), (0.0170, 0.024), (0.0, 0.024)], seg=48)
    assign_by_z(body, [mats['urushi'], mats['gold']], [(-1, 0.0262, 0), (0.0262, 1, 1)])
    lid = lathe('jar_lid', [(0.0, 0.0), (0.0188, 0.0), (0.0194, 0.0015), (0.0190, 0.0060), (0.0150, 0.0092),
                            (0.0045, 0.0100), (0.0048, 0.0118), (0.0030, 0.0134), (0.0, 0.0136)], seg=48)
    assign_by_z(lid, [mats['urushi'], mats['gold']], [(-1, 0.0098, 0), (0.0098, 1, 1)])
    # hinge at the back edge so the web can swing it open about local X
    bpy.context.view_layer.objects.active = lid
    lid.location = (0, 0, 0)
    me = lid.data
    for v in me.vertices:
        v.co.y -= 0.0188
    lid.location = (0, 0.0188, 0.028)
    lid.parent = body
    return body, lid


def build_burnisher(mats):
    prof = [(0.0, 0.0), (0.0028, 0.0012), (0.0040, 0.010), (0.0043, 0.040), (0.0041, 0.066), (0.0036, 0.071),
            (0.0040, 0.074), (0.0038, 0.077)]
    stone = [(0.0044, 0.079), (0.0056, 0.086), (0.0058, 0.095), (0.0046, 0.105), (0.0024, 0.111), (0.0, 0.1125)]
    obj = lathe('burnisher', prof + stone, seg=32)
    assign_by_z(obj, [mats['wood'], mats['gold'], mats['agate']], [(-1, 0.0705, 0), (0.0705, 0.0775, 1), (0.0775, 1, 2)])
    tip = C.link(bpy.data.objects.new('burnisher_tip', None))
    tip.parent = obj
    tip.location = (0, 0, 0.1125)
    obj.rotation_euler = (math.radians(90), 0, math.radians(105))  # handle left, stone right
    return obj


def gobo(size=1024):
    """Kumiko lattice seen through shoji paper: 9 × 6 bays of soft light with
    bars that never go fully black (paper scatters light into the shadow)."""
    s = size
    y, x = np.mgrid[0:s, 0:s] / s

    def bars(t, n, w):
        f = np.abs(((t * n) % 1.0) - 0.5) * 2  # 1 at centre of bay, 0 at bar
        return smoothstep(w, w + 0.10, f)

    g = 0.34 + 0.66 * bars(x, 9, 0.08) * bars(y, 6, 0.06)
    # the window frame fades the pattern out toward the edge of the cone
    edge = smoothstep(0.0, 0.18, x) * smoothstep(0.0, 0.18, 1 - x) * smoothstep(0.0, 0.18, y) * smoothstep(0.0, 0.18, 1 - y)
    fib = Noise(3).fbm(x.ravel() * 18, y.ravel() * 18, np.zeros(s * s), 3).reshape(s, s)
    img = np.clip(g * (0.25 + 0.75 * edge) * (0.94 + 0.06 * fib), 0, 1)
    for _ in range(6):  # separable box blur ×6 ≈ gaussian (paper diffusion)
        for ax in (0, 1):
            img = (np.roll(img, 2, ax) + np.roll(img, 1, ax) + img + np.roll(img, -1, ax) + np.roll(img, -2, ax)) / 5
    out = os.path.join(C.PUBLIC, 'textures', 'shoji_gobo.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    C.save_image('gobo', np.stack([img, img, img], 2), out, 'sRGB')
    return out


def main():
    C.reset_scene()
    if C.flag('--gobo-only'):
        print(f'[tray] gobo → {gobo()}')
        return
    tray = build_tray()
    tp = tray_textures()
    tray.data.materials.append(C.pbr_material(
        'hinoki', base=C.load_image(tp['albedo']), rough=C.load_image(tp['rough'], 'Non-Color'),
        normal=C.load_image(tp['normal'], 'Non-Color')))

    mats = {
        'bamboo': C.pbr_material('bamboo', base_color=(0.50, 0.37, 0.21), roughness=0.40),
        'urushi': C.pbr_material('urushi_black', base_color=(0.018, 0.012, 0.010), roughness=0.16, coat=1.0, coat_rough=0.08),
        'gold': C.pbr_material('gold_band', base_color=(0.96, 0.80, 0.48), roughness=0.28, metallic=1.0),
        'hair': C.pbr_material('hair', base_color=(0.05, 0.04, 0.035), roughness=0.6),
        'wet': C.pbr_material('urushi_wet', base_color=(0.478, 0.118, 0.071), roughness=0.10, coat=1.0, coat_rough=0.05),
        'wood': C.pbr_material('turned_wood', base_color=(0.30, 0.17, 0.09), roughness=0.38),
        'agate': C.pbr_material('agate', base_color=(0.72, 0.36, 0.12), roughness=0.07, coat=0.6, coat_rough=0.03),
    }
    brush = build_brush(mats)
    jar, lid = build_jar(mats)
    burn = build_burnisher(mats)

    # layout (Blender: -Y faces the web camera). Tools along the front edge.
    brush.location = (0.050, -0.104, 0.0034)
    jar.location = (0.150, 0.055, 0.0)
    burn.location = (-0.178, -0.098, 0.0044)
    slots = {'slot_bowl': (-0.012, 0.004, 0.0), 'slot_brush': tuple(brush.location),
             'slot_jar': tuple(jar.location), 'slot_burnisher': tuple(burn.location)}
    empties = []
    for name, loc in slots.items():
        e = C.link(bpy.data.objects.new(name, None))
        e.location = loc
        empties.append(e)

    g = gobo()
    print(f'[tray] gobo → {g}')
    objs = [tray, brush, jar, lid, burn] + empties + [o for o in bpy.data.objects if o.name.endswith('_tip')]
    C.export_glb(objs, os.path.join(C.WORK, 'tray_tools_raw.glb'))
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs if o.type == 'MESH')
    print(f'[tray] exported tray_tools_raw.glb tris={tris}')

    if C.flag('--preview'):
        import bowl_shape as B
        bowl, meta = B.build_object('chawan')
        bp = {k: os.path.join(C.TEX_SRC, f'bowl_{k}.png') for k in ('albedo', 'rough', 'normal')}
        bowl.data.materials.append(C.pbr_material(
            'ceramic', base=C.load_image(bp['albedo']), rough=C.load_image(bp['rough'], 'Non-Color'),
            normal=C.load_image(bp['normal'], 'Non-Color'), coat=0.55, coat_rough=0.22))
        bowl.location = slots['slot_bowl']
        C.setup_cycles(samples=96, res=(1200, 800))
        C.world_hdri(strength=0.30, rotation_deg=40)
        key = C.add_spot((-0.40, -0.30, 0.42), (0, 0, 0.03), energy=60, kelvin=2700, size_deg=46, blend=0.25, radius=0.01)
        C.add_area((0.40, -0.05, 0.14), (0, 0, 0.04), energy=0.8, size=0.4, color=(0.62, 0.71, 0.85), name='Rim')
        # the gobo as a light texture would need nodes; the web does that — here just the key
        C.add_camera((0.0, -0.46, 0.34), (0, 0.0, 0.02), lens=42, name='cam_tray')
        C.render(os.path.join(C.PREVIEWS, 'tray_scene.png'))
        print('[tray] preview rendered')


main()
