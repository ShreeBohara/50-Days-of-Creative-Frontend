"""Pre-fracture the chawan → 12 shard sets + crack-seam JSON.

    blender -b --factory-startup -P blender/build_fracture.py -- [--only Z1_drop] [--preview]

For each impact zone (6 azimuths around the rim) × severity (drop / fling):
  1. Scatter seeds on the wall's mid-surface — dense rings around the impact
     point, a sparse spread elsewhere — plus one weighted seed at the base so
     the foot ring always survives whole as the "anchor" shard.
  2. Each seed's power-diagram cell (a convex polyhedron of bisector planes)
     is Boolean-intersected with the watertight bowl → one shard per cell.
  3. Cut faces are identified geometrically (they lie on a bisector plane), so
     we know exactly which neighbour each cut face touches. The edges where a
     glazed face meets a cut face are the visible crack; they're chained into
     polylines, resampled at 1.5 mm, and written as seams with a crack-race
     distance from the impact point.
Bad draws (slivers, a cell that splits into two pieces, wrong piece count) are
rejected and re-seeded, so every shipped variant is clean by construction.

Output (three.js coords, Y up): public/models/fracture/<id>.glb (geometry +
two named materials, no textures — the runtime reuses the bowl's material) and
public/data/seams/<id>.json.
"""

import heapq
import json
import math
import os
import sys
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector, noise  # noqa: E402

import bowl_shape as B  # noqa: E402
import lib_common as C  # noqa: E402

SEVERITIES = {
    # rings: (geodesic radius m, count); far: seeds spread over the rest of the wall
    'drop': {'rings': [(0.014, 2), (0.034, 2)], 'far': 3, 'range': (6, 9)},
    'fling': {'rings': [(0.009, 3), (0.020, 4), (0.036, 5)], 'far': 7, 'range': (18, 24)},
}
ANCHOR_SEED = Vector((0.0, 0.0, 0.0115))
ANCHOR_WEIGHT = 0.00185           # power-diagram weight (m²) — lifts the anchor boundary up the wall
MIN_VOLUME_CM3 = 0.30
MAX_TRIES = 12
SEAM_STEP = 0.0015


def to_three(v):
    return [round(v[0], 6), round(v[2], 6), round(-v[1], 6)]


# ------------------------------------------------------------- mid-surface

def mid_profile():
    """Wall mid-surface from the rim (s=0) down to the foot junction."""
    inner = B._resample(B._catmull_rom(B.INNER_CP), 200)[::-1]  # rim → centre
    outer = B._resample(B._catmull_rom(B.OUTER_CP), 200)        # rim → foot
    mid = (inner + outer) / 2
    seg = np.linalg.norm(np.diff(mid, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    return mid, s


MID, MID_S = mid_profile()


def surface_point(theta, s_len):
    s_len = float(np.clip(s_len, 0.0, MID_S[-1]))
    r = float(np.interp(s_len, MID_S, MID[:, 0]))
    z = float(np.interp(s_len, MID_S, MID[:, 1]))
    r, z = B.deform(r, z, theta)
    return Vector((r * math.cos(theta), r * math.sin(theta), z)), r


def zone_theta(zone):
    """three.js azimuth φ = zone·60° (0 = front +Z) → Blender angle θ = φ − 90°."""
    return math.radians(zone * 60.0 - 90.0)


def make_seeds(zone, sev, rng):
    cfg = SEVERITIES[sev]
    th_i = zone_theta(zone)
    impact, r_rim = surface_point(th_i, 0.0)
    seeds = [ANCHOR_SEED.copy()]
    weights = [ANCHOR_WEIGHT]
    # rings of seeds in the half-disc below the impact point (radial + concentric cracks)
    for radius, count in cfg['rings']:
        for k in range(count):
            a = math.pi * (k + 0.5) / count + rng.uniform(-0.28, 0.28)
            d = radius * rng.uniform(0.82, 1.18)
            along = d * math.cos(a)          # around the circumference
            down = d * math.sin(a) + 0.002   # down the profile
            p, _ = surface_point(th_i + along / r_rim, down)
            seeds.append(p)
            weights.append(0.0)
    # sparse seeds over the rest of the wall, kept away from the impact cluster
    placed = 0
    cand = 0
    far_zone = cfg['rings'][-1][0] * 1.35
    while placed < cfg['far'] and cand < 400:
        cand += 1
        th = th_i + math.pi + rng.uniform(-1.0, 1.0) * math.pi * 0.92
        s_len = rng.uniform(0.012, 0.052)
        p, r = surface_point(th, s_len)
        if (p - impact).length < far_zone:
            continue
        if any((p - q).length < 0.030 for q in seeds[1:]):
            continue
        seeds.append(p)
        weights.append(0.0)
        placed += 1
    return seeds, weights, impact


# ------------------------------------------------------------------ cells

def planes_for(i, seeds, weights):
    """Half-spaces n·x <= c bounding power cell i (one per other seed)."""
    ai, wi = seeds[i], weights[i]
    out = []
    for j, (aj, wj) in enumerate(zip(seeds, weights)):
        if j == i:
            continue
        n = 2.0 * (aj - ai)
        c = aj.length_squared - ai.length_squared + wi - wj
        L = n.length
        out.append((j, n / L, c / L))
    return out


def cell_object(i, planes, fracture_mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.2, 0.2, 0.16)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, 0.045)), verts=bm.verts)
    for (_, n, c) in planes:
        co = n * c
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-7,
                               plane_co=co, plane_no=n, clear_outer=True)
        boundary = [e for e in bm.edges if e.is_boundary]
        if boundary:
            bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
        if len(bm.verts) == 0:
            break
    me = bpy.data.meshes.new(f'cell_{i}')
    bm.to_mesh(me)
    bm.free()
    obj = C.link(bpy.data.objects.new(f'cell_{i}', me))
    obj.data.materials.append(fracture_mat)
    return obj


def boolean_intersect(bowl, cell, name):
    obj = bowl.copy()
    obj.data = bowl.data.copy()
    obj.name = name
    C.link(obj)
    mod = obj.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'INTERSECT'
    mod.object = cell
    solvers = [e.identifier for e in mod.bl_rna.properties['solver'].enum_items]
    mod.solver = 'MANIFOLD' if 'MANIFOLD' in solvers else 'EXACT'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


# ------------------------------------------------------------- analysis

def classify_cut_faces(bm, planes, tol=3e-6):
    """face.index → neighbour id for faces lying on a bisector plane."""
    cut = {}
    for f in bm.faces:
        for (j, n, c) in planes:
            if abs(f.normal.dot(n)) < 0.999:
                continue
            if all(abs(v.co.dot(n) - c) < tol for v in f.verts):
                cut[f.index] = j
                break
    return cut


PROF = B.profile()[0]
_SEG_A = PROF[:-1]
_SEG_B = PROF[1:]


def surface_normal(p):
    """Approximate lathe normal at a point — a pure function of position, so
    every shard sharing a crack vertex computes exactly the same answer."""
    r = math.hypot(p.x, p.y)
    q = np.array([r, p.z])
    ab = _SEG_B - _SEG_A
    t = np.clip(((q - _SEG_A) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-12), 0, 1)
    d = np.linalg.norm(_SEG_A + ab * t[:, None] - q, axis=1)
    k = int(np.argmin(d))
    tr, tz = ab[k] / max(np.linalg.norm(ab[k]), 1e-12)
    nr, nz = tz, -tr
    if r < 1e-6:
        return Vector((0.0, 0.0, 1.0))
    return Vector((nr * p.x / r, nr * p.y / r, nz)).normalized()


def roughen_offset(p):
    """Tangential crack wander: two octaves of vector noise, projected onto the
    bowl surface so the glaze stays on the glaze (no bumps at the crack)."""
    v = noise.noise_vector(p / 0.0090 + Vector((3.1, 7.7, 1.3))) * 0.0012
    v += noise.noise_vector(p / 0.0032 + Vector((9.2, 2.4, 5.5))) * 0.00045
    n = surface_normal(p)
    return v - n * v.dot(n)


def mark_and_densify(bm, planes):
    """Tag cut faces with their neighbour (face int layer 'nb' = seed+1, 0 =
    glaze) and split every crack edge once so the wander has vertices to move."""
    nb = bm.faces.layers.int.new('nb')
    bm.faces.ensure_lookup_table()
    cut = classify_cut_faces(bm, planes)
    for f in bm.faces:
        f[nb] = cut.get(f.index, -1) + 1
    seam = [e for e in bm.edges
            if len(e.link_faces) == 2 and ((e.link_faces[0][nb] > 0) != (e.link_faces[1][nb] > 0))]
    if seam:
        bmesh.ops.subdivide_edges(bm, edges=seam, cuts=1, use_grid_fill=False)
    return nb


def _seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-18)))
    return (a + ab * t - p).length


def roughen_variant(shards):
    """Move every cut-face vertex by the same wander in every shard that owns it.

    Positions shared by several shards (a crack seen from both sides, a triple
    junction through the wall) are clustered with a KD-tree; each cluster gets
    one offset, scaled down to whatever the most cramped adjacent face in ANY
    owning shard can take without folding — so pieces still fit exactly.
    """
    from mathutils.kdtree import KDTree

    per = []
    allpos = []
    for s in shards:
        bm = bmesh.new()
        bm.from_mesh(s['obj'].data)
        nb = bm.faces.layers.int.get('nb')
        moved = sorted({v for f in bm.faces if f[nb] > 0 for v in f.verts}, key=lambda v: v.index)
        per.append((bm, moved, len(allpos)))
        allpos.extend(v.co.copy() for v in moved)
    kd = KDTree(len(allpos))
    for i, co in enumerate(allpos):
        kd.insert(co, i)
    kd.balance()
    parent = list(range(len(allpos)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, co in enumerate(allpos):
        for (_, j, _) in kd.find_range(co, 5e-6):
            ri, rj = find(i), find(j)
            if ri != rj:
                parent[rj] = ri
    want = {}
    scale = defaultdict(lambda: 1.0)
    for bm, moved, base in per:
        for k, v in enumerate(moved):
            root = find(base + k)
            if root not in want:
                want[root] = roughen_offset(allpos[root])
            d = want[root].length
            if d < 1e-9:
                continue
            for f in v.link_faces:
                for e in f.edges:
                    if v in e.verts:
                        continue
                    lim = 0.4 * _seg_dist(v.co, e.verts[0].co, e.verts[1].co) / d
                    if lim < scale[root]:
                        scale[root] = lim
    for (bm, moved, base), s in zip(per, shards):
        for k, v in enumerate(moved):
            root = find(base + k)
            v.co += want[root] * min(1.0, scale[root])
        bm.normal_update()
        bm.to_mesh(s['obj'].data)
        bm.free()


def components(bm):
    seen = set()
    comps = []
    for f0 in bm.faces:
        if f0.index in seen:
            continue
        stack = [f0]
        seen.add(f0.index)
        comp = []
        while stack:
            f = stack.pop()
            comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        comps.append(comp)
    return comps


def chain(edges):
    """Chain undirected (a, b) vertex-index edges into polylines (lists of indices)."""
    adj = defaultdict(list)
    for k, (a, b) in enumerate(edges):
        adj[a].append((b, k))
        adj[b].append((a, k))
    used = set()
    chains = []
    starts = [v for v in adj if len(adj[v]) == 1] + [v for v in adj if len(adj[v]) != 1]
    for s in starts:
        for nb, k in adj[s]:
            if k in used:
                continue
            used.add(k)
            line = [s, nb]
            cur = nb
            while True:
                nxt = [(n, e) for (n, e) in adj[cur] if e not in used]
                if len(nxt) != 1:
                    break
                n, e = nxt[0]
                used.add(e)
                line.append(n)
                cur = n
            chains.append(line)
    return chains


def resample_line(pts, nrms, step=SEAM_STEP):
    pts = np.array(pts)
    nrms = np.array(nrms)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    n = max(2, int(math.ceil(total / step)) + 1)
    t = np.linspace(0, total, n)
    P = np.stack([np.interp(t, s, pts[:, k]) for k in range(3)], 1)
    N = np.stack([np.interp(t, s, nrms[:, k]) for k in range(3)], 1)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    return P, N, t, total


def crack_distances(seams, impact):
    """Dijkstra over the crack graph from the impact point (Euclidean hops)."""
    nodes = []
    for si, sm in enumerate(seams):
        for k in range(len(sm['P'])):
            nodes.append((si, k))
    index = {nk: i for i, nk in enumerate(nodes)}
    pos = np.array([seams[si]['P'][k] for si, k in nodes])
    adj = defaultdict(list)
    for si, sm in enumerate(seams):
        for k in range(len(sm['P']) - 1):
            a, b = index[(si, k)], index[(si, k + 1)]
            w = float(np.linalg.norm(pos[a] - pos[b]))
            adj[a].append((b, w))
            adj[b].append((a, w))
    # junctions: endpoints of different seams that meet
    ends = [index[(si, 0)] for si in range(len(seams))] + [index[(si, len(sm['P']) - 1)] for si, sm in enumerate(seams)]
    for x in ends:
        for y in ends:
            if x < y:
                d = float(np.linalg.norm(pos[x] - pos[y]))
                if d < 0.0025:
                    adj[x].append((y, d))
                    adj[y].append((x, d))
    imp = np.array(impact)
    d0 = np.linalg.norm(pos - imp, axis=1)
    dist = np.full(len(nodes), np.inf)
    heap = []
    for i in np.argsort(d0)[:3]:
        dist[i] = d0[i]
        heapq.heappush(heap, (d0[i], int(i)))
    while heap:
        d, a = heapq.heappop(heap)
        if d > dist[a]:
            continue
        for b, w in adj[a]:
            nd = d + w
            if nd < dist[b]:
                dist[b] = nd
                heapq.heappush(heap, (nd, b))
    # anything unreachable (an isolated crack) starts at its straight-line distance, slowed
    dist = np.where(np.isfinite(dist), dist, d0 * 1.3)
    out = []
    i = 0
    for sm in seams:
        n = len(sm['P'])
        out.append(dist[i:i + n])
        i += n
    return out


# ------------------------------------------------------------------ variant

def build_variant(zone, sev, bowl, mats, seed):
    rng = np.random.RandomState(seed)
    seeds, weights, impact = make_seeds(zone, sev, rng)
    shards = []
    temp = []
    ok = True
    reason = ''
    for i in range(len(seeds)):
        planes = planes_for(i, seeds, weights)
        cell = cell_object(i, planes, mats['fracture'])
        temp.append(cell)
        if len(cell.data.vertices) == 0:
            continue
        sh = boolean_intersect(bowl, cell, f'shard_{i:02d}')
        bm = bmesh.new()
        bm.from_mesh(sh.data)
        bm.faces.ensure_lookup_table()
        if len(bm.faces) == 0:
            bm.free()
            bpy.data.objects.remove(sh)
            continue
        comps = components(bm)
        if len(comps) > 1:
            vols = sorted(sum(abs(f.calc_area()) for f in c) for c in comps)
            ok = False
            reason = f'cell {i} split into {len(comps)} parts (areas {vols[:3]})'
        vol = abs(bm.calc_volume(signed=True)) * 1e6
        if vol < MIN_VOLUME_CM3:
            ok = False
            reason = f'cell {i} sliver {vol:.3f} cm3'
        mark_and_densify(bm, planes)
        manifold = all(e.is_manifold for e in bm.edges)
        if not manifold:
            ok = False
            reason = f'cell {i} non-manifold'
        bm.to_mesh(sh.data)
        bm.free()
        shards.append({'seed_index': i, 'obj': sh, 'volume': vol, 'planes': planes})
        if not ok:
            break
    lo, hi = SEVERITIES[sev]['range']
    if ok:
        roughen_variant(shards)
    if ok and not (lo <= len(shards) <= hi):
        ok = False
        reason = f'{len(shards)} shards outside {lo}-{hi}'
    for c in temp:
        bpy.data.objects.remove(c)
    if not ok:
        for s in shards:
            bpy.data.objects.remove(s['obj'])
        return None, reason
    return (shards, impact), ''


def finalize_variant(vid, zone, sev, shards, impact, mats):
    """Assign ids, materials, UVs; extract seams; export glb + json."""
    # ids: anchor (seed 0) is id 0; the rest ordered by distance from impact
    anchor = [s for s in shards if s['seed_index'] == 0][0]
    rest = sorted([s for s in shards if s['seed_index'] != 0],
                  key=lambda s: (_centroid(s['obj']) - impact).length)
    ordered = [anchor] + rest
    seed_to_id = {s['seed_index']: k for k, s in enumerate(ordered)}

    objs = []
    shard_json = []
    seam_edges = defaultdict(list)   # (a,b) -> list of (p0,p1,n0,n1)
    for s in ordered:  # two-pass rename so no final name collides with a seed-index name
        s['obj'].name = f'tmp_{s["seed_index"]:02d}'
    for sid, s in enumerate(ordered):
        obj = s['obj']
        obj.name = f'shard_{sid:02d}'
        me = obj.data
        me.materials.clear()
        me.materials.append(mats['ceramic'])
        me.materials.append(mats['fracture'])
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.faces.ensure_lookup_table()
        uv = bm.loops.layers.uv.active
        nb_layer = bm.faces.layers.int.get('nb')
        neighbours = set()
        cut_nb = {}
        for f in bm.faces:
            j = f[nb_layer] - 1
            if j < 0:
                f.material_index = 0
                continue
            nb = seed_to_id.get(j)
            f.material_index = 1
            cut_nb[f.index] = nb
            if nb is not None and f.calc_area() > 1e-6:
                neighbours.add(nb)
            # planar UVs in the cut plane (1 unit = 3 cm) for the clay grain
            n = f.normal
            t = n.orthogonal().normalized()
            b = n.cross(t)
            for lp in f.loops:
                lp[uv].uv = (lp.vert.co.dot(t) / 0.03, lp.vert.co.dot(b) / 0.03)
        # glaze-to-cut edges are the visible crack
        for e in bm.edges:
            fs = e.link_faces
            if len(fs) != 2:
                continue
            a_cut = fs[0].index in cut_nb
            b_cut = fs[1].index in cut_nb
            if a_cut == b_cut:
                continue
            cf, gf = (fs[0], fs[1]) if a_cut else (fs[1], fs[0])
            nb = cut_nb[cf.index]
            if nb is None or nb < sid:
                continue  # each crack is recorded once, from the lower id
            p0, p1 = e.verts[0].co.copy(), e.verts[1].co.copy()
            n0 = _glaze_normal(e.verts[0], cut_nb)
            n1 = _glaze_normal(e.verts[1], cut_nb)
            seam_edges[(sid, nb)].append((p0, p1, n0, n1))
        bm.faces.layers.int.remove(nb_layer)
        bm.to_mesh(me)
        bm.free()
        C.smooth_by_angle(obj, 38.0)
        # origin → centre of volume (physics pivots about the real centre of mass)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
        com = obj.location.copy()
        obj['shardId'] = sid
        obj['anchor'] = sid == 0
        objs.append(obj)
        shard_json.append({'id': sid, 'name': obj.name, 'anchor': sid == 0, 'com': to_three(com),
                           'volumeCm3': round(s['volume'], 3), 'neighbors': sorted(neighbours)})

    # symmetric neighbour lists
    for sj in shard_json:
        for nb in sj['neighbors']:
            other = shard_json[nb]['neighbors']
            if sj['id'] not in other:
                other.append(sj['id'])
                other.sort()

    seams = []
    for (a, b), segs in sorted(seam_edges.items()):
        key = lambda v: (round(v.x, 7), round(v.y, 7), round(v.z, 7))  # noqa: E731
        vid_of = {}
        coords = []
        nrm_acc = []
        edges = []
        for (p0, p1, n0, n1) in segs:
            ids = []
            for p, n in ((p0, n0), (p1, n1)):
                k = key(p)
                if k not in vid_of:
                    vid_of[k] = len(coords)
                    coords.append(p)
                    nrm_acc.append(Vector(n))
                else:
                    nrm_acc[vid_of[k]] += n
                ids.append(vid_of[k])
            edges.append(tuple(ids))
        for line in chain(edges):
            pts = [coords[v] for v in line]
            nrs = [nrm_acc[v].normalized() for v in line]
            P, N, t, total = resample_line([tuple(p) for p in pts], [tuple(n) for n in nrs])
            if total < 0.003:
                continue
            seams.append({'a': a, 'b': b, 'P': P, 'N': N, 't': t, 'length': total})

    dists = crack_distances(seams, impact)
    seam_json = []
    for k, (sm, d) in enumerate(zip(seams, dists)):
        seam_json.append({
            'id': k, 'a': sm['a'], 'b': sm['b'],
            'points': [to_three(p) for p in sm['P']],
            'normals': [[round(float(x), 4) for x in to_three(n)] for n in sm['N']],
            'arclen': [round(float(x), 6) for x in sm['t']],
            'length': round(float(sm['length']), 6),
            'impactDist': [round(float(x), 6) for x in d],
        })
    data = {'variant': vid, 'zone': zone, 'severity': sev, 'impact': to_three(impact),
            'anchor': 0, 'shards': shard_json, 'seams': seam_json}
    os.makedirs(os.path.join(C.PUBLIC, 'data', 'seams'), exist_ok=True)
    with open(os.path.join(C.PUBLIC, 'data', 'seams', f'{vid}.json'), 'w') as fh:
        json.dump(data, fh, separators=(',', ':'))
    C.export_glb(objs, os.path.join(C.WORK, 'fracture', f'{vid}.glb'))
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    total_len = sum(s['length'] for s in seam_json)
    print(f'[fracture] {vid}: shards={len(objs)} seams={len(seam_json)} crack={total_len * 1000:.0f}mm tris={tris}')
    return objs, data


def _centroid(obj):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return sum(vs, Vector()) / max(1, len(vs))


def _glaze_normal(vert, cut_nb):
    n = Vector()
    for f in vert.link_faces:
        if f.index not in cut_nb:
            n += f.normal * f.calc_area()
    return n.normalized() if n.length > 0 else Vector((0, 0, 1))


def main():
    only = None
    a = C.argv()
    if '--only' in a:
        only = a[a.index('--only') + 1]
    C.reset_scene()
    bowl, _ = B.build_object('chawan_src')
    mats = {
        'ceramic': C.pbr_material('ceramic', base_color=(0.87, 0.80, 0.72), roughness=0.4),
        'fracture': C.pbr_material('fracture', base_color=(0.48, 0.25, 0.14), roughness=0.9),
    }
    bowl.data.materials.append(mats['ceramic'])
    report = {}
    for zone in range(6):
        for sev in ('drop', 'fling'):
            vid = f'Z{zone}_{sev}'
            if only and vid != only:
                continue
            res = None
            for attempt in range(MAX_TRIES):
                seed = 6400 + zone * 101 + (0 if sev == 'drop' else 53) + attempt * 997
                res, why = build_variant(zone, sev, bowl, mats, seed)
                if res:
                    break
                print(f'[fracture] {vid} attempt {attempt} rejected: {why}')
            if not res:
                raise RuntimeError(f'{vid}: no clean fracture after {MAX_TRIES} tries')
            shards, impact = res
            objs, data = finalize_variant(vid, zone, sev, shards, impact, mats)
            report[vid] = {'shards': len(objs), 'seams': len(data['seams'])}
            if C.flag('--preview'):
                preview_variant(vid, objs, bowl)
            for o in objs:
                bpy.data.objects.remove(o)
    with open(os.path.join(C.WORK, 'fracture_report.json'), 'w') as fh:
        json.dump(report, fh, indent=1)


def preview_variant(vid, objs, bowl):
    """Exploded view: push each shard outward from the bowl centre."""
    bowl.hide_render = True
    centre = Vector((0, 0, 0.04))
    saved = []
    for o in objs:
        saved.append(o.location.copy())
        d = o.location - centre
        o.location = o.location + d.normalized() * 0.0035 if d.length > 1e-6 else o.location
    if not bpy.context.scene.camera:
        C.setup_cycles(samples=48, res=(900, 700))
        C.world_hdri(strength=0.5, rotation_deg=40)
        C.add_spot((-0.32, -0.34, 0.30), (0, 0, 0.03), energy=38, kelvin=3200, size_deg=40, blend=0.5, radius=0.05)
        C.add_camera((0.0, -0.34, 0.24), (0, 0, 0.04), lens=55, name='cam_frac')
    cam = bpy.context.scene.camera
    th = zone_theta(int(vid[1]))
    cam.location = (0.26 * math.cos(th), 0.26 * math.sin(th), 0.16)
    C.look_at(cam, (0, 0, 0.04))
    C.render(os.path.join(C.PREVIEWS, f'frac_{vid}.png'))
    for o, loc in zip(objs, saved):
        o.location = loc
    bowl.hide_render = False


main()
