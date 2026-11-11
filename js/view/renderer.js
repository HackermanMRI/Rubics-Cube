// Draws the cube with CSS 3D transforms. Every cubie's transform is computed
// from the logical state (plus the turn in progress); cubies are never
// re-parented, so the DOM cannot fall out of step with the state.

import { apply, multiply, rotation } from '../core/math.js';
import { faceOf, homeNormals } from '../core/state.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (n) => Math.round(n * 1e5) / 1e5;

/** CSS matrix3d for a y-up rotation matrix and position (CSS y points down). */
function cssTransform(m, pos, unit) {
  return `matrix3d(${round(m[0])},${round(-m[3])},${round(m[6])},0,${round(-m[1])},${round(m[4])},${round(-m[7])},0,${round(m[2])},${round(-m[5])},${round(m[8])},0,${round(pos[0] * unit)},${round(-pos[1] * unit)},${round(pos[2] * unit)},1)`;
}

const ALL_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export class CubeRenderer {
  #cubeEl;
  #cubieEls = [];
  #state;
  #unit = 100;
  #frame = 0;
  #finish = null;

  constructor(sceneEl, state) {
    this.sceneEl = sceneEl;
    this.#cubeEl = document.createElement('div');
    this.#cubeEl.className = 'cube';
    for (const cubie of state.cubies) {
      const el = document.createElement('div');
      el.className = 'cubie';
      const stickered = new Set(homeNormals(cubie.home).map(faceOf));
      for (const normal of ALL_NORMALS) {
        const letter = faceOf(normal);
        const face = document.createElement('div');
        face.className = `face face--${letter}`;
        if (stickered.has(letter)) {
          const sticker = document.createElement('div');
          sticker.className = `sticker sticker--${letter}`;
          sticker.dataset.cubie = String(cubie.id);
          sticker.dataset.normal = normal.join(',');
          face.append(sticker);
        }
        el.append(face);
      }
      this.#cubieEls.push(el);
      this.#cubeEl.append(el);
    }
    sceneEl.append(this.#cubeEl);
    this.#state = state;
    this.resize();
  }

  /** Fit the cube to the scene element. */
  resize() {
    const { width, height } = this.sceneEl.getBoundingClientRect();
    this.#unit = Math.round(Math.max(36, Math.min(120, Math.min(width, height) / 6.2)));
    this.sceneEl.style.setProperty('--u', `${this.#unit}px`);
    this.#sync();
  }

  setState(state) {
    this.#state = state;
    if (!this.#finish) this.#sync();
  }

  /** `m` maps cube space to view space. */
  setOrientation(m) {
    this.#cubeEl.style.transform = cssTransform(m, [0, 0, 0], 1);
  }

  /** Animate one move from the current state. Resolves when it ends or is stopped. */
  play(move, ms) {
    this.stop();
    if (ms <= 0) return Promise.resolve();
    const turning = this.#state.cubies.filter((c) => move.layers.includes(c.pos[move.axis]));
    const total = (move.q * Math.PI) / 2;
    return new Promise((resolve) => {
      let start = null;
      this.#finish = () => {
        cancelAnimationFrame(this.#frame);
        this.#finish = null;
        resolve();
      };
      const step = (time) => {
        if (start === null) start = time;
        const t = Math.min(1, (time - start) / ms);
        const r = rotation(move.axis, total * easeInOut(t));
        for (const c of turning) {
          this.#cubieEls[c.id].style.transform = cssTransform(multiply(r, c.rot), apply(r, c.pos), this.#unit);
        }
        if (t < 1) this.#frame = requestAnimationFrame(step);
        else this.#finish();
      };
      this.#frame = requestAnimationFrame(step);
    });
  }

  /** End the current animation immediately and redraw from the state. */
  stop() {
    if (this.#finish) {
      this.#finish();
      this.#sync();
    }
  }

  /** Grid position and outward normal (cube space) of a sticker element. */
  stickerAt(target) {
    const el = target instanceof Element ? target.closest('.sticker') : null;
    if (!el) return null;
    const cubie = this.#state.cubies[Number(el.dataset.cubie)];
    const home = el.dataset.normal.split(',').map(Number);
    return { pos: cubie.pos, normal: apply(cubie.rot, home) };
  }

  #sync() {
    for (const c of this.#state.cubies) {
      this.#cubieEls[c.id].style.transform = cssTransform(c.rot, c.pos, this.#unit);
    }
  }
}
