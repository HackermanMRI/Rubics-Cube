# Rubik's Cube Simulator: plan, architecture and methodology

## 1. Problem

The original app (`legacy-python/main.py`, Ursina) works, but the cube breaks
when moves are made faster than about one per second. The goal is a web
version that keeps what was good (camera-relative keys), fixes the breakage at
the root, and adds better animation, controls and features.

### Root cause of the breakage

`rotate_layer()` re-parents nine cubelets to a shared `pivot`, animates the
pivot for 0.25 s, and only detaches them 0.8 s later. A second move inside
that window resets `pivot.rotation` while the first layer is still attached,
then rotates the pivot again, dragging the old cubelets along with the new
ones. Replaying that logic numerically for `R` then `U`:

| Gap between the two moves | Cubelets ending up inside another cubelet |
|---|---|
| 1.0 s | 0 |
| 0.5 s | 4 |
| 0.3 s | 4 |

Two design flaws cause it: the scene graph *is* the state (there is no logical
model to recover from), and nothing serialises moves.

## 2. Goals and non-goals

Goals

- Moves can be issued at any speed without corrupting the cube.
- Orbit with the mouse; turn with the keyboard, on-screen buttons, or by dragging a sticker. Works with touch.
- Standard notation: `U D L R F B`, primes, double turns, slices `M E S`, wide moves, rotations `x y z`.
- Scramble, timer, move counter, solved detection, undo/redo, solve, typed algorithms.
- No runtime dependencies and no build step; deployable as static files.

Non-goals (for this version)

- An optimal solver (Kociemba). "Solve" replays the session in reverse.
- Other cube sizes, accounts, a backend, or saved sessions.

## 3. Architecture

```
            input                       core (no DOM)                     view
 ┌──────────────────────┐   move   ┌──────────────────────┐  play()  ┌──────────────┐
 │ keyboard / buttons   ├─────────►│ Game                 ├─────────►│ CubeRenderer │
 │ algorithm text box   │          │  history, timer      │          │ (CSS 3D)     │
 │ PointerControls      │          │  MoveQueue ──────────┤◄─────────┤ promise done │
 │  (orbit, drag-turn)  │          │  CubeState (truth)   │ onChange │              │
 └──────────────────────┘          └──────────────────────┘─────────►└──────────────┘
```

| Module | Responsibility |
|---|---|
| `js/core/math.js` | 3x3 matrices; exact integer quarter-turn rotations |
| `js/core/moves.js` | Move model `{axis, layers, q}`, notation parser, inverse, simplify, frame remapping |
| `js/core/state.js` | `CubeState`: 27 cubies (integer position + integer rotation matrix), immutable `apply`, `isSolved` |
| `js/core/scramble.js` | Random-move scrambles without wasted moves |
| `js/core/queue.js` | `MoveQueue`: one move animates at a time; commit after the animation |
| `js/core/game.js` | `Game`: history, undo/redo, timer, counter, scramble/solve/reset |
| `js/view/renderer.js` | Builds the DOM cube; draws state; animates one move |
| `js/view/pointer.js` | Orbit and drag-to-turn |
| `js/main.js` | Wiring, keyboard, panel |

### How the three flaws are designed out

1. **State is separate from the picture.** `CubeState` is the only truth. The
   renderer computes every cubie's transform from it and never reads the DOM
   back. Positions and rotations are integers, so there is no float drift.
2. **Moves are serialised.** `MoveQueue` plays one move, waits for the
   animation promise, commits it to the state, then takes the next. Input
   during a turn simply waits in line. Reset cancels through a generation
   counter so a stale animation can never commit.
3. **No re-parenting.** During a turn the renderer draws each affected cubie
   at `R(θ) · (position, rotation)`; when the turn ends it redraws from the
   committed state.

### Animation

`requestAnimationFrame` with cubic ease-in-out. Turn time shrinks as the
backlog grows (`base / (1 + 0.5 · pending)`, floor 45 ms), so fast input stays
responsive instead of piling up. Half turns take 1.5x. Scramble and solve use
a short fixed cap. `prefers-reduced-motion` makes turns instant.

### Controls

Notation is relative to the viewer: the orbit matrix is snapped to the nearest
axis-aligned orientation and each move is remapped through it, so `R` is
always the side on the right. Dragging a sticker picks the in-plane direction
the drag follows on screen; the turn axis is `normal × direction`.

### Why CSS 3D and no libraries

The cube is 27 boxes. CSS 3D transforms draw that on the GPU, and DOM hit
testing gives the dragged sticker for free (no ray casting). Avoiding Three.js
and a bundler removes the supply chain, the build, and the install step.
Trade-off: no real lighting or shadows. If those are wanted later, only
`renderer.js` and the hit test in `pointer.js` need replacing.

## 4. Security

There is no backend, no authentication, no stored data and no network calls,
so the attack surface is the page itself.

| Concern | Control |
|---|---|
| XSS via the algorithm box | Strict whitelist parser; all output written with `textContent`; no `innerHTML` anywhere |
| Script injection in general | CSP: `default-src 'none'; script-src 'self'; style-src 'self'` (no inline, no eval) |
| Self-inflicted hang | Algorithms capped at 500 moves; input capped at 2000 characters |
| Supply chain | Zero runtime dependencies; CI uses only first-party GitHub actions |

## 5. Methodology

- **Order of work:** reproduce the bug, design, core logic test-first, view, browser check, review.
- **Tests:** `node --test`, no test dependencies. The core has no DOM access so it is tested directly, including a regression test that fires 400 moves in one tick.
- **Browser check:** driven in headless Chrome: rapid key input, scramble, undo, solve, algorithm box (valid and invalid), sticker drag, orbit, mobile width, with the CSP enforced and the console clean.
- **Git:** work on a branch, small focused commits, pull request into `main`, CI runs the tests on every push and PR.

## 6. Possible next steps

- A real solver (two-phase), running in a Web Worker.
- Saving best times in `localStorage`.
- 2x2 and 4x4 (the move model already takes arbitrary layer lists).
