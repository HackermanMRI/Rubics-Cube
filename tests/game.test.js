import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/core/game.js';
import { MoveQueue } from '../js/core/queue.js';
import { CubeState } from '../js/core/state.js';
import { parseAlgorithm } from '../js/core/moves.js';

/** Animator whose turns take one timer tick, so moves really do overlap in time. */
function fakeAnimator() {
  const a = {
    active: 0, maxActive: 0, played: 0, durations: [], release: null,
    play(move, ms) {
      a.active++; a.played++; a.durations.push(ms);
      a.maxActive = Math.max(a.maxActive, a.active);
      return new Promise((resolve) => {
        const done = () => { a.active--; a.release = null; resolve(); };
        a.release = done;
        setTimeout(done, 0);
      });
    },
    stop() { if (a.release) a.release(); },
  };
  return a;
}

function newGame(extra = {}) {
  const animator = fakeAnimator();
  let clock = 0;
  const game = new Game({ animator, now: () => clock, ...extra });
  return { game, animator, tick: (ms) => { clock += ms; } };
}

/** Deterministic PRNG (mulberry32) so scramble tests are repeatable. */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const play = (game, alg) => parseAlgorithm(alg).forEach((m) => game.play(m));

test('queue runs one move at a time, in order', async () => {
  const animator = fakeAnimator();
  const committed = [];
  const queue = new MoveQueue({ animator, durationFor: () => 10, commit: (item) => committed.push(item.move) });
  for (let i = 0; i < 50; i++) queue.enqueue({ move: i });
  assert.equal(queue.busy, true);
  await queue.idle();
  assert.deepEqual(committed, [...Array(50).keys()]);
  assert.equal(animator.maxActive, 1);
});

test('REGRESSION: 400 moves fired with no delay leave a valid, correct cube', async () => {
  const { game, animator } = newGame();
  const alg = Array(100).fill("R U R' F").join(' ');
  play(game, alg); // all enqueued in the same tick, like key mashing
  await game.queue.idle();
  assert.equal(animator.maxActive, 1);
  assert.deepEqual(game.state, CubeState.solved().applyAll(parseAlgorithm(alg)));
  const cells = new Set(game.state.cubies.map((c) => c.pos.join()));
  assert.equal(cells.size, 27); // no two cubies share a cell
  assert.equal(game.moveCount, 400);
});

test('turns speed up while a backlog is waiting', async () => {
  const { game, animator } = newGame();
  play(game, 'R U F D L B');
  await game.queue.idle();
  assert.ok(animator.durations[1] < animator.durations[5]); // 4 moves waiting behind it
  assert.equal(animator.durations[5], 220);
});

test('undo and redo walk the history', async () => {
  const { game } = newGame();
  play(game, "R U F'");
  game.undo(); game.undo();
  await game.queue.idle();
  assert.deepEqual(game.state, CubeState.solved().applyAll(parseAlgorithm('R')));
  assert.equal(game.moveCount, 1);
  game.redo();
  await game.queue.idle();
  assert.deepEqual(game.state, CubeState.solved().applyAll(parseAlgorithm('R U')));
  play(game, 'D'); // a new move discards the redo stack
  assert.equal(game.redo(), false);
  game.undo(); game.undo(); game.undo();
  assert.equal(game.undo(), false);
  await game.queue.idle();
  assert.equal(game.state.isSolved(), true);
});

test('scramble arms the timer; it runs from the first turn until solved', async () => {
  const { game, tick } = newGame({ random: seeded(7) });
  game.scramble();
  await game.queue.idle();
  assert.equal(game.state.isSolved(), false);
  assert.equal(game.timerRunning, false);
  assert.equal(game.moveCount, 0);

  const solution = [...game.applied].reverse().map((m) => ({ ...m, q: -m.q }));
  play(game, 'y'); // looking around does not start the timer or count
  assert.equal(game.timerRunning, false);
  game.undo();
  for (const move of solution) { tick(100); game.play(move); }
  assert.equal(game.timerRunning, true);
  await game.queue.idle();
  assert.equal(game.state.isSolved(), true);
  assert.equal(game.timerRunning, false);
  assert.equal(game.moveCount, solution.length);
  assert.equal(game.elapsedMs(), 100 * (solution.length - 1));
});

test('solve returns to solved and clears the session', async () => {
  const { game } = newGame();
  game.scramble();
  play(game, "R U R' U' x M2");
  game.solve(); // requested while moves are still queued
  await game.queue.idle();
  assert.equal(game.state.isSolved(), true);
  assert.equal(game.moveCount, 0);
  assert.equal(game.history.length, 0);
  assert.equal(game.timerRunning, false);
});

test('reset mid-turn drops queued moves and never commits them', async () => {
  const { game, animator } = newGame();
  play(game, 'R U F D L B');
  game.reset();
  play(game, 'U');
  await game.queue.idle();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(game.state, CubeState.solved().applyAll(parseAlgorithm('U')));
  assert.equal(animator.played, 2); // the turn in flight at reset, then U
  assert.equal(game.moveCount, 1);
});
