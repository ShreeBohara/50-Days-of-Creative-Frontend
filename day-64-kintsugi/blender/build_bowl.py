"""Build the chawan → public/models/bowl.glb (+ look-dev previews).

    blender -b --factory-startup -P blender/build_bowl.py -- [--fast] [--preview]

--fast     1024² textures (look-dev iteration)
--preview  Cycles renders into blender/_previews/
"""

import math
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import bowl_shape as B  # noqa: E402
import lib_common as C  # noqa: E402


def bowl_material(paths):
    alb = C.load_image(paths['albedo'], 'sRGB')
    rgh = C.load_image(paths['rough'], 'Non-Color')
    nrm = C.load_image(paths['normal'], 'Non-Color')
    mat = C.pbr_material('ceramic', base=alb, rough=rgh, normal=nrm,
                         coat=0.55, coat_rough=0.22)
    return mat


def preview_scene(bowl):
    C.setup_cycles(samples=128, res=(1100, 800))
    C.world_hdri(strength=0.35, rotation_deg=40)
    # stand-in tray so the contact shadow reads
    bpy.ops.mesh.primitive_plane_add(size=0.6, location=(0, 0, 0))
    tray = bpy.context.active_object
    tray.data.materials.append(C.pbr_material('tray_proxy', base_color=(0.07, 0.035, 0.018), roughness=0.55))
    C.add_spot((-0.32, -0.34, 0.30), (0, 0, 0.03), energy=38, kelvin=2700, size_deg=34, blend=0.5, radius=0.05)
    C.add_area((0.35, -0.1, 0.12), (0, 0, 0.04), energy=0.9, size=0.4, color=(0.62, 0.71, 0.85), name='Rim')
    return tray


def main():
    fast = C.flag('--fast')
    C.reset_scene()
    bowl, meta = B.build_object('chawan')
    size = 1024 if fast else 2048
    paths = B.synth_textures(meta, C.TEX_SRC, size=size,
                             seal_path=os.path.join(C.TEX_SRC, 'seal.png'))
    bowl.data.materials.append(bowl_material(paths))
    tris = sum(len(p.vertices) - 2 for p in bowl.data.polygons)
    print(f'[bowl] verts={len(bowl.data.vertices)} tris={tris} bounds={meta["bounds"]}')

    bowl['kind'] = 'bowl'
    bowl['massKg'] = 0.32
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(C.WORK, 'bowl.blend'))

    C.export_glb([bowl], os.path.join(C.WORK, 'bowl_raw.glb'))
    print('[bowl] exported raw glb')

    if C.flag('--preview'):
        preview_scene(bowl)
        views = {
            'front34': ((0.0, -0.36, 0.20), (0, 0, 0.042)),
            'well': ((0.05, -0.16, 0.30), (0, 0, 0.02)),
            'side': ((0.30, -0.20, 0.07), (0, 0, 0.042)),
        }
        for name, (loc, tgt) in views.items():
            C.add_camera(loc, tgt, lens=60, name=f'cam_{name}')
            C.render(os.path.join(C.PREVIEWS, f'bowl_{name}.png'))
        # underside: flip the bowl for the seal
        bowl.rotation_euler = (math.pi, 0, 0)
        bowl.location = (0, 0, 0.09)
        C.add_camera((0.0, -0.08, 0.34), (0, 0, 0.09), lens=70, name='cam_under')
        C.render(os.path.join(C.PREVIEWS, 'bowl_under.png'))
        print('[bowl] previews rendered')


main()
