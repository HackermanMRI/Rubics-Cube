___________rUBICs cUBe____________
----------HackermanMRI29----------
----------------------------------
    ______
   /     /|  
  /_____/ |  
  |     | |  
  |     | /  
  |_____|/   3*3

------------- Guides -------------

🧠 Step 1: Choose a 3D Library
Python doesn’t have native 3D GUI tools, but here are a few options:

Pygame + OpenGL (PyOpenGL): Good if you're okay learning OpenGL basics.

Ursina Engine: Super beginner-friendly for 3D games.

VPython / vpython: Simple for physics and 3D visualization.

ModernGL: More advanced OpenGL wrapper.

✅ Recommendation: Use Ursina – it’s lightweight, beginner-friendly, and perfect for visual projects like this.


🎯 Step 2: Rubik's Cube Logic
Even without the UI, you can start by coding:

A 3x3x3 data structure (list of lists or a class) to represent cube state.

Rotation logic for each face (U, D, L, R, F, B).

Stick to standard cube notation (like F', R, U2, etc.).


🧊 Step 3: Display in 3D
Use colored cubes (each face one color).

Group them into one big 3x3x3 cube.

Make only the outer layers rotatable.

Add mouse/keyboard controls to rotate cube or individual faces.


🕹️ Step 4: Controls & Animation
Detect which face the user wants to rotate.

Apply the rotation animation smoothly.

Update the cube's internal state accordingly.


🧪 Step 5: Scramble & Solve
Add a “Scramble” button.

Later, if you want to go big brain, implement a solver like Kociemba’s algorithm.
