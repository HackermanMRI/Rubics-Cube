// Serialises moves: exactly one turn animates at a time and the state is
// committed only after its animation ends. Input arriving mid-turn waits in
// line instead of touching a half-rotated layer, which is what broke the cube
// in the original Python version.

export class MoveQueue {
  #pending = [];
  #generation = 0;
  #running = false;
  #idleWaiters = [];
  #animator;
  #durationFor;
  #commit;
  #onIdle;

  /**
   * @param {object} deps
   * @param {{play(move, ms): Promise<void>, stop(): void}} deps.animator
   * @param {(item, pendingCount: number) => number} deps.durationFor
   * @param {(item) => void} deps.commit called once per finished move
   * @param {() => void} [deps.onIdle] called when the last queued move has finished
   */
  constructor({ animator, durationFor, commit, onIdle = () => {} }) {
    this.#onIdle = onIdle;
    this.#animator = animator;
    this.#durationFor = durationFor;
    this.#commit = commit;
  }

  get busy() {
    return this.#running;
  }

  enqueue(item) {
    this.#pending.push(item);
    if (!this.#running) {
      this.#running = true;
      this.#drain(this.#generation);
    }
  }

  /** Drop everything, including the turn in progress, without committing it. */
  cancel() {
    this.#generation++;
    this.#pending = [];
    this.#running = false;
    this.#animator.stop();
    this.#resolveIdle();
  }

  /** Resolves once the queue is empty. */
  idle() {
    if (!this.#running) return Promise.resolve();
    return new Promise((resolve) => this.#idleWaiters.push(resolve));
  }

  async #drain(generation) {
    while (this.#pending.length) {
      const item = this.#pending.shift();
      await this.#animator.play(item.move, this.#durationFor(item, this.#pending.length));
      if (generation !== this.#generation) return; // cancelled while animating
      this.#commit(item);
    }
    this.#running = false;
    this.#resolveIdle();
    this.#onIdle();
  }

  #resolveIdle() {
    const waiters = this.#idleWaiters;
    this.#idleWaiters = [];
    for (const resolve of waiters) resolve();
  }
}
