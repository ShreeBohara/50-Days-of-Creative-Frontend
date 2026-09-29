"""Shared helpers for the headless Blender asset scripts.

Every script runs as:
    blender -b --factory-startup -P blender/<script>.py -- [--preview]

Units are metres (1 BU = 1 m). Blender is Z-up; the glTF exporter converts to
three.js' Y-up, so Blender -Y ("front view") becomes three.js +Z (toward the
web camera).
"""

import math
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DAY = os.path.dirname(HERE)
PUBLIC = os.path.join(DAY, 'public')
WORK = os.path.join(HERE, '_work')        # intermediate .blend / textures (gitignored)
PREVIEWS = os.path.join(HERE, '_previews')  # look-dev renders (gitignored)
TEX_SRC = os.path.join(HERE, 'textures')  # synthesised source textures (committed)

for d in (WORK, PREVIEWS, TEX_SRC):
    os.makedirs(d, exist_ok=True)


def argv():
    """Arguments after the `--` separator."""
    a = sys.argv
    return a[a.index('--') + 1:] if '--' in a else []


def flag(name):
    return name in argv()


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = 'METRIC'
    s.unit_settings.scale_length = 1.0
    return s


def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def mesh_object(name, verts, faces, uvs=None, collection=None):
    """Build a mesh object from python lists. `uvs` is per-loop (list per face)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if uvs is not None:
        uvl = me.uv_layers.new(name='UVMap')
        i = 0
        for fi, poly in enumerate(me.polygons):
            for li in poly.loop_indices:
                uvl.data[li].uv = uvs[fi][li - poly.loop_start]
                i += 1
    me.validate(clean_customdata=False)
    me.update()
    return link(bpy.data.objects.new(name, me), collection)


def smooth_by_angle(obj, degrees=38.0):
    me = obj.data
    me.shade_smooth()
    if hasattr(me, 'set_sharp_from_angle'):
        me.set_sharp_from_angle(angle=math.radians(degrees))


def save_image(name, arr, path, colorspace='sRGB'):
    """arr: (H, W, 3|4) float in [0,1], row 0 = bottom (Blender convention)."""
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1))], axis=2)
    img = bpy.data.images.new(name, width=w, height=h, alpha=False)
    img.colorspace_settings.name = colorspace
    img.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img


def load_image(path, colorspace='sRGB'):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    return img


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def pbr_material(name, base=None, rough=None, normal=None, base_color=None,
                 roughness=0.5, metallic=0.0, coat=0.0, coat_rough=0.1,
                 normal_strength=1.0):
    """Principled material wired the way the glTF exporter understands."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = coat_rough
    if base_color is not None:
        # colours are authored as sRGB (what a designer picks); the socket is linear
        bsdf.inputs['Base Color'].default_value = (*[srgb_to_linear(c) for c in base_color], 1.0)
    x = -700
    if base:
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = base
        n.location = (x, 300)
        nt.links.new(n.outputs['Color'], bsdf.inputs['Base Color'])
    if rough:
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = rough
        n.location = (x, 0)
        # glTF packs roughness into G of metallicRoughness
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        sep.location = (x + 300, 0)
        nt.links.new(n.outputs['Color'], sep.inputs['Color'])
        nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = normal
        n.location = (x, -300)
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.location = (x + 300, -300)
        nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def setup_cycles(samples=96, res=(960, 720)):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        s.cycles.device = 'GPU'
    except Exception:
        s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'None'
    s.render.image_settings.file_format = 'PNG'
    return s


def world_hdri(strength=0.35, rotation_deg=0.0, background=(0.12, 0.09, 0.07)):
    """HDRI for lighting/reflections but a flat umber backdrop for the camera."""
    w = bpy.data.worlds.new('World')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(PUBLIC, 'hdri', 'pine_attic_1k.hdr'))
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value[2] = math.radians(rotation_deg)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Generated'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
    bg_light = nt.nodes.new('ShaderNodeBackground')
    bg_light.inputs['Strength'].default_value = strength
    nt.links.new(env.outputs['Color'], bg_light.inputs['Color'])
    bg_cam = nt.nodes.new('ShaderNodeBackground')
    bg_cam.inputs['Color'].default_value = (*background, 1.0)
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
    nt.links.new(bg_light.outputs['Background'], mix.inputs[1])
    nt.links.new(bg_cam.outputs['Background'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return w


def kelvin_rgb(k):
    """Approximate blackbody colour (Tanner Helland fit), linear-ish 0..1."""
    t = k / 100.0
    if t <= 66:
        r = 1.0
        g = max(0.0, min(1.0, (99.4708025861 * math.log(t) - 161.1195681661) / 255))
        b = 0.0 if t <= 19 else max(0.0, min(1.0, (138.5177312231 * math.log(t - 10) - 305.0447927307) / 255))
    else:
        r = max(0.0, min(1.0, 329.698727446 * ((t - 60) ** -0.1332047592) / 255))
        g = max(0.0, min(1.0, 288.1221695283 * ((t - 60) ** -0.0755148492) / 255))
        b = 1.0
    return (r, g, b)


def add_camera(loc, target, lens=50.0, name='Cam'):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_start = 0.01
    obj = link(bpy.data.objects.new(name, cam))
    obj.location = loc
    look_at(obj, target)
    bpy.context.scene.camera = obj
    return obj


def look_at(obj, target):
    from mathutils import Vector
    d = Vector(target) - Vector(obj.location)
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def add_spot(loc, target, energy=40.0, kelvin=2700, size_deg=40.0, blend=0.35,
             radius=0.02, name='Key'):
    li = bpy.data.lights.new(name, 'SPOT')
    li.energy = energy
    li.color = kelvin_rgb(kelvin)
    li.spot_size = math.radians(size_deg)
    li.spot_blend = blend
    li.shadow_soft_size = radius
    obj = link(bpy.data.objects.new(name, li))
    obj.location = loc
    look_at(obj, target)
    return obj


def add_area(loc, target, energy=5.0, size=0.3, color=(1, 1, 1), name='Fill'):
    li = bpy.data.lights.new(name, 'AREA')
    li.energy = energy
    li.size = size
    li.color = color
    obj = link(bpy.data.objects.new(name, li))
    obj.location = loc
    look_at(obj, target)
    return obj


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def export_glb(objects, path, extras=True, apply_modifiers=True, export_materials='EXPORT'):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=apply_modifiers,
        export_extras=extras,
        export_materials=export_materials,
        export_image_format='AUTO',
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_attributes=False,
        export_animations=False,
    )
    return path
