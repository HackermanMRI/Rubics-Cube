#hackermanmri29_Mrinmoy_Dewan
#CSE, Jagannath University

from ursina import *
import random

app = Ursina()
title_text = Text(
    text="3D Rubik's Cube Simulator",
    position=(0,-0.17),    
    origin=(0, 0),
    scale=1.1,
    color=color.azure,
    background=True
)


DirectionalLight().look_at(Vec3(1, -2, -1))
AmbientLight(color=color.rgba(100, 100, 255, 0.2))
camera.position = (0,-1,-15)
camera.rotation =(0,0,0)
camera.look_at(Vec3(0,0,0))
EditorCamera()

CUBE_SIZE = 0.7
OFFSET = CUBE_SIZE*1.13

#Creating boxs
def create_cubelet(x, y, z):
    cubelet = Entity(
        model='cube',
        color=color.black,
        scale=Vec3(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
        position=Vec3(x * OFFSET, y * OFFSET, z * OFFSET),
        collider='box'
    )

    face_thickness = 0.01
    face_size = CUBE_SIZE * 1.12

    if y == 1:  # Up face
        Entity(parent=cubelet, model='quad', color=color.white, scale=face_size, position=(0, 0.501, 0), rotation_x=90, double_sided=True)
    if y == -1:  # Down face
        Entity(parent=cubelet, model='quad', color=color.yellow, scale=face_size, position=(0, -0.501, 0), rotation_x=-90, double_sided=True)
    if z == 1:  # Front face
        Entity(parent=cubelet, model='quad', color=color.red, scale=face_size, position=(0, 0, 0.501), double_sided=True)
    if z == -1:  # Back face
        Entity(parent=cubelet, model='quad', color=color.pink, scale=face_size, position=(0, 0, -0.501), rotation_y=180, double_sided=True)
    if x == -1:  # Left face
        Entity(parent=cubelet, model='quad', color=color.blue, scale=face_size, position=(-0.501, 0, 0), rotation_y=90,double_sided=True)
    if x == 1:  # Right face
        Entity(parent=cubelet, model='quad', color=color.green, scale=face_size, position=(0.501, 0, 0), rotation_y=-90, double_sided=True)

    return cubelet


#arrange the boxs
cubelets = []
for x in range(-1,2):
    for y in range(-1,2):
        for z in range(-1,2):
            cubelet = create_cubelet(x,y,z)
            cubelets.append(cubelet)




pivot = Entity()
#layer rotation function
def rotate_layer(axis, value, angle):
    pivot.rotation = (0, 0, 0)  
    pivot.position = (0, 0, 0)

    selected = []

    for c in cubelets:
        pos = c.position
        if round(getattr(pos, axis)) == value:
            selected.append(c)
            c.world_parent = pivot  

    if axis == 'x':
        pivot.animate_rotation_x(angle, duration=0.25)
    elif axis == 'y':
        pivot.animate_rotation_y(angle, duration=0.25)
    elif axis == 'z':
        pivot.animate_rotation_z(angle, duration=0.25)

    def detach():
        for c in selected:
            c.world_parent = scene 

    invoke(detach, delay=0.8)


#detection which part is faced currently 
def get_closest_axis_direction(vector):
    axes = {
        'x': Vec3(1,0,0),
        '-x': Vec3(-1,0,0),
        'y': Vec3(0,1,0),
        '-y': Vec3(0,-1,0),
        'z': Vec3(0,0,1),
        '-z': Vec3(0,0,-1),
    }

    best_match = max(axes.items(), key=lambda a: vector.dot(a[1]))
    return best_match[0]




move_history = []
#taking input
def input(key):
    if key == 'z' and move_history:
        axis, value, angle = move_history.pop()
        rotate_layer(axis, value, -angle)
        return

    base_key = key.lower()

    direction_map = {
        'b': camera.forward,
        'f': -camera.forward,
        'r': camera.right,
        'l': -camera.right,
        'u': camera.up,
        'd': -camera.up,
    }

    if base_key not in direction_map:
        return

    dir_vec = direction_map[key]
    face = get_closest_axis_direction(dir_vec)

    axis = face.strip('-')
    value = 1 if '-' not in face else -1
    angle = -90 if held_keys['shift'] else 90

    rotate_layer(axis, value, angle)

    move_history.append((axis, value, angle))
    

#suffle
def shuffle_cube():
    axis = random.choice(['x', 'y', 'z'])
    value = random.choice([-1, 1])
    angle = random.choice([90, -90])

    rotate_layer(axis, value, angle)

shuffle_button = Button(text='Shuffle', scale=0.1, position=(-0.5, 0.2),color=color.pink.tint(-.2),text_color=color.black)
shuffle_button.on_click = shuffle_cube


#reset
def reset_cube():
    for c in cubelets:
        destroy(c)
    cubelets.clear()

    for x in range(-1,2):
        for y in range(-1,2):
            for z in range(-1,2):
                cubelet = create_cubelet(x,y,z)
                cubelets.append(cubelet)
    
reset_button = Button(text='Reset', scale=0.1, position=(-0.62, 0.2),color=color.green.tint(-.2),text_color=color.black)
reset_button.on_click = reset_cube


#bottom text
controls_text = Text(
    text="""
    Key Bindings For Moves

R -> R                  L -> L                  U -> U                  D -> D                 F -> F

R'-> shift + R          L'-> shift + L          U'-> shift + U          D'-> shift + D         F'-> shift + F

""",
    position=(0, -0.35),  
    origin=(0, 0),
    scale=1.1,
    color=color.yellow,
    background=True

)
hint_text = Text(
    text="""*always delay 1 sec after making a move...
    otherwise the cube will be broke""",
    position=(0.62, 0.2),  
    origin=(0, 0),
    scale=0.8,
    color=color.red,
    background=True
)


app.run()
