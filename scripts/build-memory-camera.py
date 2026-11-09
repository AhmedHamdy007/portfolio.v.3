"""Original AH / 16 camera. Run in a separate Blender background process.

Coordinates are authored Y-up, matching Three.js; the GLB exporter therefore
does not rotate axes. No user's open Blender scene is read or modified.
Reference: https://docs.blender.org/api/main/bpy.ops.export_scene.html
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/album/memory-camera.glb'
SOURCE = ROOT / 'design/memory-camera.blend'
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metal=0, rough=.4):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

brass = material('Satin champagne aluminium', (.47, .39, .25), .82, .29)
edge = material('Polished edge', (.72, .66, .5), .9, .19)
black = material('Graphite enamel', (.018, .024, .022), .55, .31)
leather = material('Forest leather', (.031, .05, .041), .03, .82)
rubber = material('Machined grip', (.012, .017, .015), .25, .66)
ink = material('Ivory engraving', (.77, .75, .64), .2, .44)
red = material('Shutter enamel', (.37, .057, .034), .3, .3)
glass = material('Coated optics', (.018, .07, .061), .45, .095)
glass.surface_render_method = 'DITHERED'
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = .34
glass.diffuse_color = (.018, .07, .061, .34)

def finish(o, name, mat, bevel=0, smooth=False):
    o.name = name
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('Manufactured edge radius', 'BEVEL')
        mod.width = bevel; mod.segments = 3
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        weighted = o.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=weighted.name)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def box(name, location, dimensions, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object; o.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, bevel)

def ring(name, outer, inner, depth, z, mat, segments=96):
    verts = []
    for radius, height in [(outer,z-depth/2),(outer,z+depth/2),(inner,z+depth/2),(inner,z-depth/2)]:
        verts.extend((radius*math.cos(i*math.tau/segments), radius*math.sin(i*math.tau/segments),height) for i in range(segments))
    faces = []
    for j in range(4):
        for i in range(segments):
            nxt=(i+1)%segments; k=(j+1)%4
            faces.append((j*segments+i,j*segments+nxt,k*segments+nxt,k*segments+i))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    return finish(o,name,mat,.012,True)

def cylinder(name, radius, depth, location, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=location, rotation=rotation)
    return finish(bpy.context.object,name,mat,.012,True)

def text(name, body, location, size, mat, rotation=(0,0,0)):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=body; curve.size=size
    curve.extrude=.0015; curve.resolution_u=3
    o=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(o)
    o.location=location; o.rotation_euler=rotation
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return o

def join(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join(); o=bpy.context.object; o.name=name
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o

# A hollow camera chassis. The real opening continues behind the lens.
body=[]
body += [box('Top shell',(0,1.3,-.38),(5.7,.65,1.52),brass,.14),box('Bottom shell',(0,-1.38,-.38),(5.7,.42,1.52),brass,.12)]
body += [box('Left grip',(-2.22,-.03,-.4),(1.27,2.26,1.44),leather,.16),box('Right grip',(2.22,-.03,-.4),(1.27,2.26,1.44),leather,.16)]
body += [ring('Chassis mount',1.66,1.21,.52,.05,black),ring('Mount collar',1.7,1.42,.12,.34,edge)]
body += [box('Viewfinder surround',(-1.87,1.25,.42),(.95,.5,.14),black,.065),box('Viewfinder glass',(-1.87,1.25,.51),(.71,.29,.04),glass,.025)]
body += [cylinder('Shutter dial',.35,.18,(1.99,1.7,-.23),black,(math.pi/2,0,0)),cylinder('Shutter button',.17,.13,(1.99,1.83,-.23),red,(math.pi/2,0,0))]
body += [cylinder('Rewind dial',.4,.17,(-2,1.7,-.4),brass,(math.pi/2,0,0))]
body += [box('Hot shoe',(0,1.67,-.45),(.64,.12,.57),black,.02)]
for x in [-2.61,2.61]:
    for y in [-1.29,1.36]:
        body.append(cylinder('Recessed screw',.055,.035,(x,y,.42),black))
        body.append(box('Screw slot',(x,y,.442),(.068,.012,.006),brass,.001))
body += [text('AH monogram','ah.',(1.82,.58,.36),.37,ink),text('Serial','AH / 16',(1.72,-.73,.36),.105,ink),text('Body engraving','MEMORY INSTRUMENT',(-.4,1.32,.404),.1,black)]
# Small physical leather channels catch the sidelight without texture downloads.
for x in [-2.22,2.22]:
    for j in range(18):
        body.append(box('Leather seam',(x-.47+j*.054,-.06,.335),(.012,1.38,.012),rubber,.004))
# The fixed side of the rear hinge belongs to the chassis. Nothing crosses the
# lens axis once the cover is open: this is a real pass-through, not a fake door.
for y in [-1.14,1.14]:
    body.append(cylinder('Rear hinge socket',.075,.34,(-2.8,y,-1.18),brass,(math.pi/2,0,0)))
body.append(box('Rear latch catch',(2.74,.12,-1.17),(.14,.38,.14),edge,.025))
join(body,'CameraBody')

# One rigid, material-batched rear cover with its origin on the hinge axis.
# Runtime contract: rotation.y=0 closes it; +120 degrees opens it outward toward
# negative Z and the left of the camera. Keep the origin/vertex transform intact
# during export so the animation needs neither a second clone nor per-frame
# bounding-box work. The closed outer surface is readable from negative Z.
back=[]
back.append(box('Rear cover shell',(0,-.045,-1.25),(5.57,2.96,.12),black,.115))
back.append(box('Rear leather inset',(0,-.045,-1.323),(5.26,2.63,.036),leather,.09))
for y in [-1.485,1.40]:
    back.append(box('Rear brass horizontal rim',(0,y,-1.303),(5.29,.027,.028),brass,.01))
for x in [-2.75,2.75]:
    back.append(box('Rear brass vertical rim',(x,-.045,-1.303),(.027,2.63,.028),brass,.01))
# Interior pressure plate is a second layer of the same mesh, not another
# animated object. Its subtle rails give the departing contact sheet a physical
# destination without crowding the original front silhouette.
back.append(box('Film pressure plate',(0,-.065,-1.146),(3.32,2.1,.072),rubber,.065))
for y in [-1.045,.915]:
    back.append(box('Pressure plate guide rail',(0,y,-1.096),(3.14,.035,.024),edge,.007))
for x in [-1.48,1.48]:
    for y in [-.84,.71]:
        back.append(cylinder('Pressure plate rivet',.028,.011,(x,y,-1.10),brass))
for y in [-.67,0,.67]:
    back.append(cylinder('Moving hinge knuckle',.082,.29,(-2.8,y,-1.18),black,(math.pi/2,0,0)))
back.append(box('Rear thumb latch',(2.45,.13,-1.364),(.23,.42,.065),brass,.025))
for j in range(4):
    back.append(box('Latch knurl',(2.45,.015+j*.069,-1.40),(.17,.011,.008),black,.002))
# Rotating the text by pi around Y reverses its surface normal and X baseline;
# a viewer behind the camera consequently reads the engraving left to right.
back.append(text('Rear monogram','ah.',(.33,.1,-1.346),.42,ink,(0,math.pi,0)))
back.append(text('Rear serial','AH / 16',(.38,-.36,-1.346),.12,ink,(0,math.pi,0)))
cover=join(back,'BackDoor')
bpy.context.scene.cursor.location=(-2.8,0,-1.18)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.context.scene.cursor.location=(0,0,0)

focus=[ring('Barrel',1.49,1.22,.67,.73,black),ring('Focus lip',1.51,1.27,.065,.46,brass)]
for i in range(88):
    a=i*math.tau/88
    o=box('Knurl',(1.49*math.cos(a),1.49*math.sin(a),.81),(.052,.042,.35),rubber,.008)
    o.rotation_euler.z=a; focus.append(o)
focus.append(ring('Focus rim',1.53,1.26,.07,1.12,edge))
join(focus,'FocusBarrel')

front=[ring('Front housing',1.54,1.25,.32,1.35,black),ring('Front brass rim',1.56,1.43,.06,1.54,brass),ring('Optic retaining edge',1.29,1.22,.06,1.51,edge)]
for i in range(48):
    a=i*math.tau/48
    o=box('Calibration mark',(1.39*math.cos(a),1.39*math.sin(a),1.521),(.013,.035 if i%4 else .075,.005),ink,.001)
    o.rotation_euler.z=a-math.pi/2; front.append(o)
front.append(text('Lens engraving','AH — MEMORY OPTICS',(-.73,.91,1.526),.11,ink))
front.append(text('Lens specification','1:1.8 / 35 mm',(-.48,-1.13,1.526),.105,ink))
join(front,'FrontRing')

# Individual shutter leaves: runtime pivots reveal the actual hole.
for i in range(9):
    a=i*math.tau/9
    # Curved overlapping leaves, not triangular fan blades.
    points=[]
    arcs=[((.1,-.08),(.4,-.06),(1.1,-.22),(1.42,-.08)),
          ((1.42,-.08),(1.58,.04),(1.6,.25),(1.48,.38)),
          ((1.48,.38),(1.2,.61),(.8,.68),(.55,.57)),
          ((.55,.57),(.32,.38),(.17,.06),(.1,-.08))]
    for start,c1,c2,end in arcs:
        for j in range(6):
            t=j/6; s=1-t
            points.append((s*s*s*start[0]+3*s*s*t*c1[0]+3*s*t*t*c2[0]+t*t*t*end[0],s*s*s*start[1]+3*s*s*t*c1[1]+3*s*t*t*c2[1]+t*t*t*end[1],0))
    verts=[(x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),.57+i*.006) for x,y,z in points]
    mesh=bpy.data.meshes.new('Iris leaf'); mesh.from_pydata(verts,[],[tuple(range(len(verts)))]); mesh.update()
    o=bpy.data.objects.new(f'IrisBlade_{i:02}',mesh); bpy.context.collection.objects.link(o)
    finish(o,o.name,black)
    solid=o.modifiers.new('Leaf thickness','SOLIDIFY'); solid.thickness=.009
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=solid.name)

bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=16,radius=1,location=(0,0,1.44))
optic=bpy.context.object; optic.scale=(1.22,1.22,.09)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
finish(optic,'LensGlass',glass,0,True)

# Export only the product, before adding the editable presentation camera/lights.
OUT.parent.mkdir(parents=True,exist_ok=True); SOURCE.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=False,export_animations=False,export_cameras=False,export_lights=False,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)

scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Dark studio'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.06,.075,.065,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,power,size in [('Key',(-4,7,7),1400,5),('Rim',(5,4,-3),1800,4),('Fill',(4,-2,5),600,3)]:
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
    o=bpy.data.objects.new(name,data); scene.collection.objects.link(o); o.location=loc
    o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Product view'); cam=bpy.data.objects.new('Product view',data); scene.collection.objects.link(cam)
cam.location=(7,4,12); cam.rotation_euler=(-cam.location+Vector((0,0,.4))).to_track_quat('-Z','Y').to_euler(); data.lens=48; scene.camera=cam
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1000; scene.render.resolution_y=760; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(SOURCE.with_suffix('.png'))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
print(f'CAMERA_EXPORTED {OUT.stat().st_size} bytes')
