// Mouse / touch / pen input on the scene.
//   drag the background (or right-drag anywhere) -> orbit the whole cube
//   drag a sticker                               -> turn that layer

import { apply, multiply, orthonormalize, rotation } from '../core/math.js';

const ORBIT_RAD_PER_PX = 0.008;
const TURN_THRESHOLD_PX = 10;

/**
 * Work out which layer turn a drag across a sticker means.
 * @param {{pos:number[], normal:number[]}} hit sticker under the pointer (cube space)
 * @param {number[]} orientation cube -> view matrix
 * @param {number} dx,dy drag in screen pixels (y down)
 * @returns {{axis:number, layers:number[], q:number}}
 */
export function turnFromDrag(hit, orientation, dx, dy) {
  // Of the two directions lying in the sticker's plane, take the one the drag
  // follows most closely on screen.
  let best = null;
  for (let axis = 0; axis < 3; axis++) {
    if (hit.normal[axis]) continue;
    const dir = [0, 0, 0];
    dir[axis] = 1;
    const onScreen = apply(orientation, dir);
    const along = dx * onScreen[0] - dy * onScreen[1];
    if (!best || Math.abs(along) > Math.abs(best.along)) best = { dir, along };
  }
  const d = best.dir.map((v) => v * Math.sign(best.along || 1));
  const n = hit.normal;
  // A surface point with normal n moving along d is rotating about n x d.
  const w = [n[1] * d[2] - n[2] * d[1], n[2] * d[0] - n[0] * d[2], n[0] * d[1] - n[1] * d[0]];
  const axis = w.findIndex((v) => v !== 0);
  return { axis, layers: [hit.pos[axis]], q: w[axis] };
}

export class PointerControls {
  #drag = null;

  /**
   * @param {HTMLElement} sceneEl
   * @param {object} hooks
   * @param {() => number[]} hooks.getOrientation
   * @param {(m: number[]) => void} hooks.setOrientation
   * @param {(target: EventTarget) => object|null} hooks.stickerAt
   * @param {() => boolean} hooks.canTurn false while a turn is animating
   * @param {(move: object) => void} hooks.onTurn
   */
  constructor(sceneEl, hooks) {
    this.hooks = hooks;
    sceneEl.addEventListener('pointerdown', (e) => this.#down(e, sceneEl));
    sceneEl.addEventListener('pointermove', (e) => this.#move(e));
    sceneEl.addEventListener('pointerup', (e) => this.#up(e));
    sceneEl.addEventListener('pointercancel', (e) => this.#up(e));
    sceneEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Rotate the view by the given angles about the screen's y and x axes. */
  orbit(aboutY, aboutX) {
    const spin = multiply(rotation(1, aboutY), rotation(0, aboutX));
    this.hooks.setOrientation(orthonormalize(multiply(spin, this.hooks.getOrientation())));
  }

  #down(e, sceneEl) {
    if (this.#drag) return; // one pointer at a time
    const onSticker = e.button === 0 && e.target instanceof Element && e.target.closest('.sticker');
    this.#drag = {
      id: e.pointerId,
      mode: onSticker ? 'turn' : 'orbit',
      target: e.target,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    sceneEl.setPointerCapture(e.pointerId);
    sceneEl.classList.add('is-dragging');
  }

  #move(e) {
    const drag = this.#drag;
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.mode === 'orbit') {
      this.orbit((e.clientX - drag.lastX) * ORBIT_RAD_PER_PX, (e.clientY - drag.lastY) * ORBIT_RAD_PER_PX);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    } else if (drag.mode === 'turn') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) < TURN_THRESHOLD_PX) return;
      drag.mode = 'done'; // one turn per drag
      if (!this.hooks.canTurn()) return;
      const hit = this.hooks.stickerAt(drag.target);
      if (hit) this.hooks.onTurn(turnFromDrag(hit, this.hooks.getOrientation(), dx, dy));
    }
  }

  #up(e) {
    if (!this.#drag || e.pointerId !== this.#drag.id) return;
    this.#drag = null;
    e.currentTarget.classList.remove('is-dragging');
  }
}
