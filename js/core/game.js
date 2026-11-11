// Game controller: owns the state, history, timer and move queue. It has no
// DOM access; the view supplies an animator and listens for changes.

import { MoveQueue } from './queue.js';
import { generateScramble } from './scramble.js';
import { CubeState } from './state.js';
import { inverse, isCubeRotation, moveName, simplify } from './moves.js';

const FAST_MS = 90; // cap for scramble / solve turns
const MIN_MS = 45;
const INSTANT_SOLVE_ABOVE = 150; // moves

export class Game {
  #listeners = new Set();
  #now;
  #random;
  #getBaseDuration;
  #epoch = 0;

  constructor({ animator, now = () => performance.now(), random = Math.random, getBaseDuration = () => 220 }) {
    this.#now = now;
    this.#random = random;
    this.#getBaseDuration = getBaseDuration;
    this.queue = new MoveQueue({
      animator,
      durationFor: (item, pending) => this.#durationFor(item, pending),
      commit: (item) => this.#commit(item),
      onIdle: () => this.#emit(),
    });
    this.#clear();
  }

  /** Subscribe to changes. Returns an unsubscribe function. */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get timerRunning() {
    return this.timer.startedAt !== null;
  }

  elapsedMs() {
    return this.timerRunning ? this.#now() - this.timer.startedAt : this.timer.elapsed;
  }

  /** A turn made by the user. `label` is the notation shown in the history. */
  play(move, label = moveName(move)) {
    const counts = !isCubeRotation(move);
    if (counts && this.timer.armed) {
      this.timer.armed = false;
      this.timer.startedAt = this.#now();
    }
    this.history.push({ move, label });
    this.redoStack.length = 0;
    this.#enqueue(move, counts ? 1 : 0);
  }

  undo() {
    const entry = this.history.pop();
    if (!entry) return false;
    this.redoStack.push(entry);
    this.#enqueue(inverse(entry.move), isCubeRotation(entry.move) ? 0 : -1);
    return true;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.history.push(entry);
    this.#enqueue(entry.move, isCubeRotation(entry.move) ? 0 : 1);
    return true;
  }

  reset() {
    this.queue.cancel();
    this.#clear();
    this.#emit();
  }

  /** Scrambles from the solved state and arms the timer for the first turn. */
  scramble(length = 20) {
    this.reset();
    for (const move of generateScramble(length, this.#random)) this.#enqueue(move, 0, { fast: true });
    this.timer.armed = true;
    this.scrambled = true;
    this.#emit();
  }

  /**
   * Returns to solved by undoing everything applied so far, with cancelling
   * turns merged. This is a replay in reverse, not an optimal solver.
   */
  solve() {
    const moves = simplify(this.applied).reverse().map(inverse);
    const instant = moves.length > INSTANT_SOLVE_ABOVE;
    this.#epoch++;
    this.history = [];
    this.redoStack = [];
    this.applied = [];
    this.moveCount = 0;
    this.timer = { armed: false, startedAt: null, elapsed: 0 };
    this.scrambled = false;
    for (const move of moves) this.queue.enqueue({ move, delta: 0, fast: true, instant, epoch: this.#epoch });
    this.#emit();
  }

  #clear() {
    this.#epoch++;
    this.state = CubeState.solved();
    this.history = [];
    this.redoStack = [];
    this.applied = []; // every move since the solved state, pending ones included
    this.moveCount = 0;
    this.scrambled = false;
    this.timer = { armed: false, startedAt: null, elapsed: 0 };
  }

  #enqueue(move, delta, flags = {}) {
    this.applied.push(move);
    this.queue.enqueue({ move, delta, epoch: this.#epoch, ...flags });
    this.#emit();
  }

  #durationFor(item, pending) {
    const base = this.#getBaseDuration();
    if (base <= 0 || item.instant) return 0;
    const ms = (item.fast ? Math.min(base, FAST_MS) : base) / (1 + 0.5 * pending);
    return Math.max(MIN_MS, ms) * (Math.abs(item.move.q) === 2 ? 1.5 : 1);
  }

  #commit(item) {
    this.state = this.state.apply(item.move);
    if (item.epoch === this.#epoch && item.delta) {
      this.moveCount = Math.max(0, this.moveCount + item.delta);
      if (this.timerRunning && this.state.isSolved()) {
        this.timer.elapsed = this.#now() - this.timer.startedAt;
        this.timer.startedAt = null;
      }
    }
    this.#emit();
  }

  #emit() {
    for (const listener of this.#listeners) listener(this);
  }
}
