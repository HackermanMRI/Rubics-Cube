import test from 'node:test';
import assert from 'node:assert/strict';
import { CubeState } from '../js/core/state.js';
import { inverse, parseAlgorithm } from '../js/core/moves.js';
import { generateScramble } from '../js/core/scramble.js';

const run = (alg, state = CubeState.solved()) => state.applyAll(parseAlgorithm(alg));
const ALL = ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', 'r', 'l', 'u', 'd', 'f', 'b', 'x', 'y', 'z'];

test('a new cube is solved and has 54 stickers', () => {
  const cube = CubeState.solved();
  assert.equal(cube.isSolved(), true);
  assert.equal(cube.stickers().length, 54);
});

test('turn directions follow standard notation', () => {
  // R: front goes up.  U: right goes to front.  F: up goes to right.
  assert.equal(run('R').colorAt([1, 1, 1], 'U'), 'F');
  assert.equal(run('U').colorAt([1, 1, 1], 'F'), 'R');
  assert.equal(run('F').colorAt([1, 1, 1], 'R'), 'U');
  // L: up goes to front.  D: front goes to right.  B: up goes to left.
  assert.equal(run('L').colorAt([-1, 1, 1], 'F'), 'U');
  assert.equal(run('D').colorAt([1, -1, 1], 'R'), 'F');
  assert.equal(run('B').colorAt([-1, 1, -1], 'L'), 'U');
});

test('every move has order 4 and is undone by its inverse', () => {
  for (const m of ALL) {
    const [move] = parseAlgorithm(m);
    const once = CubeState.solved().apply(move);
    assert.deepEqual(once.apply(inverse(move)), CubeState.solved(), m);
    assert.deepEqual(run(`${m} ${m} ${m} ${m}`), CubeState.solved(), m);
    assert.deepEqual(run(`${m}2`), run(`${m} ${m}`), m);
  }
});

test('single turns unsolve the cube; whole-cube rotations do not', () => {
  for (const m of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S']) assert.equal(run(m).isSolved(), false, m);
  for (const m of ['x', 'y', 'z', "x y' z2"]) assert.equal(run(m).isSolved(), true, m);
});

test('slice, wide and rotation moves agree with their definitions', () => {
  assert.deepEqual(run('x'), run("R M' L'"));
  assert.deepEqual(run('y'), run("U E' D'"));
  assert.deepEqual(run('z'), run("F S B'"));
  assert.deepEqual(run('r'), run("R M'"));
  assert.deepEqual(run('u'), run("U E'"));
  assert.deepEqual(run('f'), run('F S'));
});

test('known algorithm orders', () => {
  const repeat = (alg, n) => Array(n).fill(alg).join(' ');
  assert.equal(run(repeat("R U R' U'", 6)).isSolved(), true);
  assert.equal(run(repeat("R U R' U'", 5)).isSolved(), false);
  assert.equal(run(repeat('R U', 105)).isSolved(), true);
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
  assert.equal(run(tPerm).isSolved(), false);
  assert.equal(run(`${tPerm} ${tPerm}`).isSolved(), true);
  assert.equal(run('M2 E2 S2').isSolved(), false); // checkerboard
});

test('apply does not mutate the previous state', () => {
  const before = CubeState.solved();
  before.apply(parseAlgorithm('R')[0]);
  assert.deepEqual(before, CubeState.solved());
});

test('scrambles have no wasted moves and are reversible', () => {
  for (let i = 0; i < 200; i++) {
    const moves = generateScramble(20);
    assert.equal(moves.length, 20);
    for (let k = 1; k < moves.length; k++) {
      const same = (a, b) => a.axis === b.axis && a.layers[0] === b.layers[0];
      assert.equal(same(moves[k], moves[k - 1]), false);
      if (k > 1) {
        assert.equal(moves[k].axis === moves[k - 1].axis && moves[k].axis === moves[k - 2].axis, false);
      }
    }
    const back = [...moves].reverse().map(inverse);
    assert.equal(CubeState.solved().applyAll(moves).applyAll(back).isSolved(), true);
  }
});
