import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, quarterRotation, rotation, snapToAxes } from '../js/core/math.js';
import {
  MAX_ALGORITHM_MOVES, inverse, moveName, parseAlgorithm, parseMove, remapMove, simplify,
} from '../js/core/moves.js';

const names = (moves) => moves.map(moveName).join(' ');

test('notation round-trips through parse and moveName', () => {
  const alg = "R U' F2 Rw Lw' M E' S2 x y' z2 r u' D B L";
  assert.equal(names(parseAlgorithm(alg)), "R U' F2 r l' M E' S2 x y' z2 r u' D B L");
});

test('typographic apostrophe is accepted as prime', () => {
  assert.deepEqual(parseMove('R’'), parseMove("R'"));
});

test('invalid input is rejected', () => {
  for (const bad of ['Q', 'R3', "R''", 'Mw', 'RU', '<script>', 'R2x']) {
    assert.throws(() => parseMove(bad), /Unknown move/, bad);
  }
  assert.throws(() => parseAlgorithm('R '.repeat(MAX_ALGORITHM_MOVES + 1)), /longer than/);
  assert.deepEqual(parseAlgorithm('   '), []);
});

test('inverse flips direction', () => {
  assert.equal(moveName(inverse(parseMove('R'))), "R'");
  assert.equal(inverse(parseMove('U2')).q, -parseMove('U2').q);
  assert.equal(moveName(inverse(parseMove('U2'))), 'U2');
});

test('simplify merges and cancels adjacent turns', () => {
  assert.equal(names(simplify(parseAlgorithm("R R' U U F F F L2 L2 D"))), "U2 F' D");
  assert.equal(names(simplify(parseAlgorithm("R U U' R'"))), '');
});

test('remapMove re-expresses a move after the cube is turned around', () => {
  // View rotated 180 degrees about y: what was Right is now Left, Front is Back.
  const p = snapToAxes(rotation(1, Math.PI));
  assert.equal(moveName(remapMove(parseMove('R'), p)), 'L');
  assert.equal(moveName(remapMove(parseMove("F'"), p)), "B'");
  assert.equal(moveName(remapMove(parseMove('U'), p)), 'U');
  assert.equal(moveName(remapMove(parseMove('M'), p)), "M'");
});

test('snapToAxes returns the nearest axis-aligned orientation', () => {
  assert.deepEqual(snapToAxes(rotation(1, 0.3)), identity());
  assert.deepEqual(snapToAxes(rotation(1, Math.PI / 2 + 0.2)), quarterRotation(1, 1));
});
