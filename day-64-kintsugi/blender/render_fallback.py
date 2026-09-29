"""Tier D fallback + social image: a mended bowl turning on its tray.

    blender -b --factory-startup -P blender/render_fallback.py -- [--fast]

Imports the raw bowl + tray exports, draws one variant's seams as raised gold
(tubes along the crack polylines — kintsugi lacquer really does stand a little
proud of the glaze), throws a real kumiko lattice's shadow across it with a
2700 K spot, and renders a seamless 360° turntable (160 frames, 16 fps) plus a
1200×630 social card. ffmpeg (if present) encodes loop.webm / loop.mp4 and the
poster; without it the PNG frames are left in blender/_work/fallback/.
"""

import json
import math
import os
import shutil
import subprocess
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import bmesh  # noqa: E402
import bpy  # noqa: E402

import lib_common as C  # noqa: E402

VARIANT = 'Z1_drop'
FRAMES = 160
FPS = 16
SLOT = (-0.012, 0.004, 0.0)  # Blender coords of the bowl slot


def three_to_blender(p):
    return (p[0], -p[2], p[1])


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def gold_seams(parent):
    with open(os.path.join(C.PUBLIC, 'data', 'seams', f'{VARIANT}.json')) as fh:
        data = json.load(fh)
    gold = C.pbr_material('gold', base_color=(1.0, 0.86, 0.55), metallic=1.0, roughness=0.22)
    cu = bpy.data.curves.new('seams', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.00075
    cu.bevel_resolution = 2
    cu.use_fill_caps = True
    for s in data['seams']:
        pts = s['points']
        nrm = s['normals']
        sp = cu.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        for k, (p, n) in enumerate(zip(pts, nrm)):
            # sit the tube half-proud of the glaze
            q = [p[i] + n[i] * 0.0004 for i in range(3)]
            x, y, z = three_to_blender(q)
            sp.points[k].co = (x, y, z, 1.0)
    obj = C.link(bpy.data.objects.new('seams', cu))
    obj.data.materials.append(gold)
    obj.parent = parent
    return obj


def lattice(loc, target):
    """A kumiko screen between the key light and the tray: real shadows."""
    bm = bmesh.new()
    w, h, bar = 0.5, 0.34, 0.008
    # built in local XY so its face normal is local Z — look_at then turns it
    # square-on to the key light
    for i in range(10):
        x = -w / 2 + w * i / 9
        bmesh.ops.create_cube(bm, size=1.0, matrix=_mat((x, 0, 0), (bar, h, 0.004)))
    for j in range(7):
        y = -h / 2 + h * j / 6
        bmesh.ops.create_cube(bm, size=1.0, matrix=_mat((0, y, 0), (w, bar * 0.8, 0.004)))
    me = bpy.data.meshes.new('kumiko')
    bm.to_mesh(me)
    bm.free()
    obj = C.link(bpy.data.objects.new('kumiko', me))
    obj.location = loc
    C.look_at(obj, target)
    obj.visible_camera = False  # it only casts shadows
    return obj


def _mat(t, s):
    from mathutils import Matrix
    return Matrix.Translation(t) @ Matrix.Diagonal((*s, 1.0))


def main():
    fast = C.flag('--fast')
    C.reset_scene()
    tray_objs = import_glb(os.path.join(C.WORK, 'tray_tools_raw.glb'))
    bowl_objs = import_glb(os.path.join(C.WORK, 'bowl_raw.glb'))
    pivot = C.link(bpy.data.objects.new('turntable', None))
    pivot.location = SLOT
    for o in bowl_objs:
        if o.parent is None:
            o.parent = pivot
            o.location = (0, 0, 0)
    gold_seams(pivot)
    for o in tray_objs + bowl_objs:
        if o.type == 'MESH':
            o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None

    scene = C.setup_cycles(samples=12 if fast else 20, res=(800, 500))
    C.world_hdri(strength=0.4, rotation_deg=40, background=(0.014, 0.009, 0.006))
    key = C.add_spot((-0.5, -0.52, 0.82), (0.0, 0.0, 0.03), energy=90, kelvin=2700, size_deg=34, blend=0.55, radius=0.02)
    lattice((-0.17, -0.175, 0.3), (0.0, 0.0, 0.03))
    C.add_area((0.55, 0.35, 0.3), (0, 0, 0.04), energy=1.2, size=0.5, color=(0.62, 0.71, 0.85), name='Rim')
    cam = C.add_camera((0.0, -0.42, 0.25), (SLOT[0], SLOT[1], 0.042), lens=58, name='cam')
    del key, cam

    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.fps = FPS
    pivot.rotation_euler = (0, 0, 0)
    pivot.keyframe_insert('rotation_euler', index=2, frame=1)
    pivot.rotation_euler = (0, 0, math.radians(360 * FRAMES / (FRAMES + 1)))
    pivot.keyframe_insert('rotation_euler', index=2, frame=FRAMES)
    _linear(pivot)

    out = os.path.join(C.WORK, 'fallback')
    os.makedirs(out, exist_ok=True)
    fb = os.path.join(C.PUBLIC, 'fallback')
    os.makedirs(fb, exist_ok=True)

    # social card first (1200×630), from a lower 3/4 angle
    scene.frame_set(28)
    scene.render.resolution_x, scene.render.resolution_y = 1200, 630
    C.render(os.path.join(out, 'og.png'))
    scene.render.resolution_x, scene.render.resolution_y = 800, 500
    ff = shutil.which('ffmpeg')
    if ff:
        subprocess.run([ff, '-y', '-loglevel', 'error', '-i', os.path.join(out, 'og.png'), '-q:v', '4',
                        os.path.join(C.PUBLIC, 'og.jpg')], check=True)

    if C.flag('--card-only'):
        return
    scene.render.filepath = os.path.join(out, 'f_####')
    bpy.ops.render.render(animation=True)
    print('[fallback] frames rendered')

    if not ff:
        print('[fallback] ffmpeg not found — frames left in', out)
        return
    seq = os.path.join(out, 'f_%04d.png')
    subprocess.run([ff, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', seq, '-c:v', 'libvpx-vp9', '-b:v', '0',
                    '-crf', '38', '-row-mt', '1', '-pix_fmt', 'yuv420p', os.path.join(fb, 'loop.webm')], check=True)
    subprocess.run([ff, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', seq, '-c:v', 'libx264', '-crf', '26',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(fb, 'loop.mp4')], check=True)
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', os.path.join(out, 'f_0001.png'), '-q:v', '4',
                    os.path.join(fb, 'poster.jpg')], check=True)
    print('[fallback] encoded loop.webm, loop.mp4, poster.jpg (+ og.jpg)')


def _linear(obj):
    """Constant-speed keyframes (Blender 4.4+ slotted actions or legacy)."""
    act = obj.animation_data.action if obj.animation_data else None
    if not act:
        return
    curves = []
    if hasattr(act, 'fcurves'):
        curves = list(act.fcurves)
    else:
        for layer in getattr(act, 'layers', []):
            for strip in layer.strips:
                for bag in getattr(strip, 'channelbags', []):
                    curves += list(bag.fcurves)
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'


main()
