// The single source of truth for the cube. 27 cubies, each with an integer
// grid position and an integer rotation matrix. The view is derived from this;
// nothing is ever read back from the DOM.

import { apply, identity, multiply, quarterRotation } from './math.js';

/** Face letter for an axis-aligned unit normal. */
export function faceOf(normal) {
  if (normal[0]) return normal[0] > 0 ? 'R' : 'L';
  if (normal[1]) return normal[1] > 0 ? 'U' : 'D';
  return normal[2] > 0 ? 'F' : 'B';
}

/** Outward normals of the stickers a cubie has in its home position. */
export function homeNormals(home) {
  const normals = [];
  for (let axis = 0; axis < 3; axis++) {
    if (home[axis]) {
      const n = [0, 0, 0];
      n[axis] = home[axis];
      normals.push(n);
    }
  }
  return normals;
}

const clean = (v) => v.map((n) => n + 0); // turn -0 into 0

export class CubeState {
  constructor(cubies) {
    this.cubies = cubies;
  }

  static solved() {
    const cubies = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          cubies.push({ id: cubies.length, home: [x, y, z], pos: [x, y, z], rot: identity() });
        }
      }
    }
    return new CubeState(cubies);
  }

  /** Returns a new state; `this` is not modified. */
  apply(move) {
    const r = quarterRotation(move.axis, move.q);
    return new CubeState(
      this.cubies.map((c) =>
        move.layers.includes(c.pos[move.axis])
          ? { id: c.id, home: c.home, pos: clean(apply(r, c.pos)), rot: clean(multiply(r, c.rot)) }
          : c,
      ),
    );
  }

  applyAll(moves) {
    return moves.reduce((state, move) => state.apply(move), this);
  }

  /** Every sticker as { pos, color, facing }, where color/facing are face letters. */
  stickers() {
    const out = [];
    for (const c of this.cubies) {
      for (const n of homeNormals(c.home)) {
        out.push({ pos: c.pos, color: faceOf(n), facing: faceOf(apply(c.rot, n)) });
      }
    }
    return out;
  }

  /** Colour showing at grid position `pos` on the side called `facing`. */
  colorAt(pos, facing) {
    const hit = this.stickers().find(
      (s) => s.facing === facing && s.pos.every((v, i) => v === pos[i]),
    );
    return hit ? hit.color : null;
  }

  /** Solved in any orientation: each side shows a single colour. */
  isSolved() {
    const seen = {};
    for (const s of this.stickers()) {
      if (seen[s.facing] === undefined) seen[s.facing] = s.color;
      else if (seen[s.facing] !== s.color) return false;
    }
    return true;
  }
}
