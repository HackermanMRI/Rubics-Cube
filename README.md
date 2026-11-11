# Rubik's Cube Simulator

A 3D Rubik's Cube that runs in the browser. Plain JavaScript modules and CSS 3D
transforms: no dependencies, no build step.

By Mrinmoy Dewan (HackermanMRI), CSE, Jagannath University.

## Run it

Browsers do not load JavaScript modules from `file://`, so serve the folder:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>. To publish it, enable GitHub Pages for the
repository root; nothing needs building.

## Controls

| Input | Action |
|---|---|
| `U` `D` `L` `R` `F` `B` | Turn that face clockwise |
| `Shift` + key | Turn it counter-clockwise (`U'`, `R'`, ...) |
| `M` `E` `S` | Middle slices |
| `X` `Y` `Z` | Rotate the whole cube |
| Arrow keys | Orbit the view |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| Drag the background | Orbit the view |
| Drag a sticker | Turn that layer (mouse or touch) |

Faces are named from where you are looking, so `R` is always the side on your
right. The algorithm box also accepts double turns (`R2`), wide moves (`Rw` or
`r`) and rotations, for example `R U R' U'`.

## Features

- Moves are queued, so the cube stays intact however fast you type
- Scramble, timer (starts on your first turn), move counter, solved detection
- Undo, redo, and Solve (plays the session back in reverse)
- Adjustable turn speed; respects the reduced-motion system setting
- Works on phones

## Tests

```
npm test
```

Needs Node 20 or newer. Uses the built-in test runner, so there is nothing to
install.

## Layout

```
index.html, css/      page and styles
js/core/              cube logic, no DOM: state, moves, queue, game
js/view/              CSS 3D renderer and pointer controls
js/main.js            wiring and keyboard
tests/                unit tests
docs/DESIGN.md        plan, architecture, methodology
legacy-python/        the original Ursina version
```
