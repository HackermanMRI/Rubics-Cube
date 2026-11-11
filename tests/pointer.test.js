import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, rotation } from '../js/core/math.js';
import { moveName } from '../js/core/moves.js';
import { turnFromDrag } from '../js/view/pointer.js';

const name = (hit, dx, dy, o = identity()) => {
  const m = turnFromDrag(hit, o, dx, dy);
  return moveName({ ...m, layers: [...m.layers] });
};
const front = (x, y) => ({ pos: [x, y, 1], normal: [0, 0, 1] });

test('dragging a front sticker turns the layer it sits in, the way it was pushed', () => {
  // Screen y points down, so dy < 0 is a drag upwards.
  assert.equal(name(front(1, 0), 0, -40), 'R');   // right column pushed up
  assert.equal(name(front(1, 0), 0, 40), "R'");
  assert.equal(name(front(-1, 0), 0, 40), 'L');   // left column pulled down
  assert.equal(name(front(0, 1), -40, 0), 'U');   // top row pushed left
  assert.equal(name(front(0, -1), 40, 0), 'D');   // bottom row pushed right
  assert.equal(name(front(0, 0), 0, 40), 'M');    // middle column down
});

test('dragging on the top face', () => {
  const top = { pos: [1, 1, 1], normal: [0, 1, 0] };
  assert.equal(name(top, 40, 0), 'F');            // front edge of the top pushed right
});

test('the drag is read relative to how the cube is orbited', () => {
  // Cube turned a quarter about y: the R face now looks at the viewer.
  const o = rotation(1, -Math.PI / 2);
  const hit = { pos: [1, 0, 1], normal: [1, 0, 0] };
  assert.equal(name(hit, 0, -40, o), "F'");
});
